import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { AttackJobData } from '../engine/queue/queues/attack.queue';
import {
  resolveBattle,
  calculateLoot,
  calculatePointsExchanged,
  UnitGroup,
} from '@mmorts/shared';

export function initAttackWorker(fastify: FastifyInstance) {
  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<AttackJobData>(
    'attacks',
    async (job: Job<AttackJobData>) => {
      const { attackerVillageId, defenderVillageId, activeAttackId } = job.data;

      // ──────────────────────────────────────────
      // CAS 1 : RETOUR DES TROUPES
      // ──────────────────────────────────────────
      if (job.data.returning === true) {
        console.log(`🏠 Retour des troupes → village ${attackerVillageId}`);

        const survivors = job.data.units as Record<string, number>;

        for (const [unitType, count] of Object.entries(survivors)) {
          if (count <= 0) continue;
          await fastify.prisma.troop.upsert({
            where:  { villageId_unitType: { villageId: attackerVillageId, unitType } },
            update: { count: { increment: count } },
            create: { villageId: attackerVillageId, unitType, count },
          });
        }

        try {
          await fastify.prisma.activeAttack.delete({ where: { id: activeAttackId } });
        } catch {
          // Déjà supprimé
        }

        console.log(`✅ Troupes rentrées : ${JSON.stringify(survivors)}`);

        try {
          fastify.io.to(`village:${attackerVillageId}`).emit('troops:returned', {
            survivors,
            message: 'Vos troupes sont rentrées à la base !',
          });
        } catch (socketErr) {
          console.warn('⚠️ Socket emit échoué (non bloquant):', socketErr);
        }

        return;
      }

      // ──────────────────────────────────────────
      // CAS 2 : RÉSOLUTION DU COMBAT
      // ──────────────────────────────────────────
      const { units } = job.data;
      console.log(`⚔️  Combat : ${attackerVillageId} → ${defenderVillageId}`);

      const [attackerVillage, defenderVillage] = await Promise.all([
        fastify.prisma.village.findUnique({
          where:   { id: attackerVillageId },
          include: { troops: true },
        }),
        fastify.prisma.village.findUnique({
          where:   { id: defenderVillageId },
          include: { troops: true },
        }),
      ]);

      if (!attackerVillage || !defenderVillage) {
        console.error('❌ Village introuvable pour le combat');
        return;
      }

      const attackerGroups: UnitGroup[] = [];
      for (const [unitType, count] of Object.entries(units)) {
        if (count <= 0) continue;
        try {
          const def = fastify.gameData.getUnitDef(unitType);
          attackerGroups.push({
            unitType, count,
            attack:        def.attack,
            defense:       def.defense,
            carryCapacity: def.carryCapacity,
          });
        } catch { continue; }
      }

      const defGroups: UnitGroup[] = ((defenderVillage as any).troops ?? [])
        .filter((t: any) => t.count > 0)
        .map((t: any) => {
          try {
            const def = fastify.gameData.getUnitDef(t.unitType);
            return {
              unitType:      t.unitType,
              count:         t.count,
              attack:        def.attack,
              defense:       def.defense,
              carryCapacity: def.carryCapacity,
            };
          } catch { return null; }
        })
        .filter(Boolean) as UnitGroup[];

      const result = resolveBattle(attackerGroups, defGroups);
      const loot   = result.attackerWon
        ? calculateLoot(
            { wood: defenderVillage.wood, stone: defenderVillage.stone, iron: defenderVillage.iron },
            result.lootCapacity,
          )
        : { wood: 0, stone: 0, iron: 0 };
      const pointsExchanged = calculatePointsExchanged(result.defenderLosses, defGroups);

      const survivors: Record<string, number> = {};
      for (const [unitType, count] of Object.entries(units)) {
        const lost     = result.attackerLosses[unitType] ?? 0;
        const survived = Math.max(0, count - lost);
        if (survived > 0) survivors[unitType] = survived;
      }

      const defenderUnitsBefore = Object.fromEntries(
        ((defenderVillage as any).troops ?? []).map((t: any) => [t.unitType, t.count])
      );

      await fastify.prisma.$transaction(async (tx: any) => {
        for (const [unitType, lost] of Object.entries(result.defenderLosses)) {
          if (lost <= 0) continue;
          await tx.troop.updateMany({
            where: { villageId: defenderVillageId, unitType },
            data:  { count: { decrement: lost } },
          });
        }

        if (result.attackerWon && (loot.wood + loot.stone + loot.iron) > 0) {
          await tx.village.update({
            where: { id: defenderVillageId },
            data:  { wood: { decrement: loot.wood }, stone: { decrement: loot.stone }, iron: { decrement: loot.iron } },
          });
          await tx.village.update({
            where: { id: attackerVillageId },
            data:  { wood: { increment: loot.wood }, stone: { increment: loot.stone }, iron: { increment: loot.iron } },
          });
        }

        await tx.player.updateMany({
          where: { villages: { some: { id: defenderVillageId } } },
          data:  { totalPoints: { decrement: pointsExchanged } },
        });
        await tx.player.updateMany({
          where: { villages: { some: { id: attackerVillageId } } },
          data:  { totalPoints: { increment: pointsExchanged } },
        });

        await tx.attackReport.create({
          data: {
            attackerVillageId,
            defenderVillageId,
            unitsSent:           units,
            unitsSurvived:       survivors,
            defenderUnitsBefore,
            defenderUnitsAfter:  Object.fromEntries(
              defGroups.map(u => [
                u.unitType,
                Math.max(0, u.count - (result.defenderLosses[u.unitType] ?? 0)),
              ])
            ),
            resourcesLooted:  loot,
            pointsLost:       pointsExchanged,
            pointsGained:     pointsExchanged,
            attackerWon:      result.attackerWon,
          },
        });

        if (Object.keys(survivors).length > 0) {
          const travelMs = job.data.travelMs ?? 15000;
          const returnArrivesAt = new Date(Date.now() + travelMs);
          await tx.activeAttack.update({
            where: { id: activeAttackId },
            data: {
              status:    'returning',
              survivors,
              arrivesAt: returnArrivesAt,
            },
          });
        } else {
          await tx.activeAttack.delete({ where: { id: activeAttackId } });
        }
      });

      console.log(`✅ Combat résolu — ${result.attackerWon ? 'Victoire' : 'Défaite'}`);

      // Émissions Sockets (après transaction)
      try {
        fastify.io.to(`village:${attackerVillageId}`).emit('attack:result', {
          attackerWon:     result.attackerWon,
          attackerLosses:  result.attackerLosses,
          survivors,
          resourcesLooted: loot,
          pointsGained:    pointsExchanged,
        });

        fastify.io.to(`village:${defenderVillageId}`).emit('attack:incoming', {
          attackerWon:      result.attackerWon,
          defenderLosses:   result.defenderLosses,
          resourcesLooted:  loot,
          pointsLost:       pointsExchanged,
          attackerVillageId,
        });
      } catch (socketErr) {
        console.warn('⚠️ Socket emit échoué (non bloquant):', socketErr);
      }

      // Créer le job de retour si survivants
      if (Object.keys(survivors).length > 0) {
        const travelMs = job.data.travelMs ?? 15000;
        await (fastify as any).attackQueue.addJob({
          attackerVillageId,
          defenderVillageId,
          units:         survivors,
          activeAttackId,
          returning:     true,
          travelMs,
        }, travelMs);
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job combat ${job?.id} échoué : ${err.message}`);
  });

  return worker;
}