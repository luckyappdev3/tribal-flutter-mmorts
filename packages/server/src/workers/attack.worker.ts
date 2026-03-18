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
      const { attackerVillageId, defenderVillageId, units, activeAttackId } = job.data;

      // ── Cas 1 : RETOUR DES TROUPES ──
      // Le job de retour contient "returning: true" dans les données
      if ((job.data as any).returning === true) {
        console.log(`🏠 Retour des troupes pour le village ${attackerVillageId}`);

        const activeAttack = await fastify.prisma.activeAttack.findUnique({
          where: { id: activeAttackId },
        });

        if (activeAttack?.survivors) {
          const survivors = activeAttack.survivors as Record<string, number>;
          // Remettre les survivants dans le stock
          for (const [unitType, count] of Object.entries(survivors)) {
            if (count <= 0) continue;
            await fastify.prisma.troop.upsert({
              where:  { villageId_unitType: { villageId: attackerVillageId, unitType } },
              update: { count: { increment: count } },
              create: { villageId: attackerVillageId, unitType, count },
            });
          }
        }

        // Supprimer le mouvement actif
        await fastify.prisma.activeAttack.delete({ where: { id: activeAttackId } });

        // Notifier l'attaquant
        fastify.io.to(`village:${attackerVillageId}`).emit('troops:returned', {
          survivors: activeAttack?.survivors ?? {},
          message:   'Vos troupes sont rentrées à la base !',
        });

        return;
      }

      // ── Cas 2 : RÉSOLUTION DU COMBAT ──
      console.log(`⚔️  Combat : ${attackerVillageId} → ${defenderVillageId}`);

      const [attackerVillage, defenderVillage] = await Promise.all([
        fastify.prisma.village.findUnique({ where: { id: attackerVillageId }, include: { troops: true } }),
        fastify.prisma.village.findUnique({ where: { id: defenderVillageId }, include: { troops: true } }),
      ]);

      if (!attackerVillage || !defenderVillage) return;

      // Construire les groupes d'unités
      const attackerGroups: UnitGroup[] = [];
      for (const [unitType, count] of Object.entries(units)) {
        if (count <= 0) continue;
        try {
          const def = fastify.gameData.getUnitDef(unitType);
          attackerGroups.push({ unitType, count, attack: def.attack, defense: def.defense, carryCapacity: def.carryCapacity });
        } catch { continue; }
      }

      const defenderGroups: UnitGroup[] = defenderVillage.troops
        .filter(t => t.count > 0)
        .map(t => {
          try {
            const def = fastify.gameData.getUnitDef(t.unitType);
            return { unitType: t.unitType, count: t.count, attack: def.attack, defense: def.defense, carryCapacity: def.carryCapacity };
          } catch { return null; }
        })
        .filter(Boolean) as UnitGroup[];

      const result        = resolveBattle(attackerGroups, defenderGroups);
      const loot          = result.attackerWon
        ? calculateLoot({ wood: defenderVillage.wood, stone: defenderVillage.stone, iron: defenderVillage.iron }, result.lootCapacity)
        : { wood: 0, stone: 0, iron: 0 };
      const pointsExchanged = calculatePointsExchanged(result.defenderLosses, defenderGroups);

      // Calcul des survivants attaquants
      const survivors: Record<string, number> = {};
      for (const [unitType, count] of Object.entries(units)) {
        const lost     = result.attackerLosses[unitType] ?? 0;
        const survived = Math.max(0, count - lost);
        if (survived > 0) survivors[unitType] = survived;
      }

      const defenderUnitsBefore = Object.fromEntries(defenderVillage.troops.map(t => [t.unitType, t.count]));

      // Transaction BDD
      await fastify.prisma.$transaction(async (tx) => {
        // Pertes défenseur
        for (const [unitType, lost] of Object.entries(result.defenderLosses)) {
          if (lost <= 0) continue;
          await tx.troop.updateMany({
            where: { villageId: defenderVillageId, unitType },
            data:  { count: { decrement: lost } },
          });
        }

        // Transfert des ressources pillées
        if (result.attackerWon && (loot.wood + loot.stone + loot.iron) > 0) {
          await tx.village.update({
            where: { id: defenderVillageId },
            data: { wood: { decrement: loot.wood }, stone: { decrement: loot.stone }, iron: { decrement: loot.iron } },
          });
          await tx.village.update({
            where: { id: attackerVillageId },
            data: { wood: { increment: loot.wood }, stone: { increment: loot.stone }, iron: { increment: loot.iron } },
          });
        }

        // Points
        await tx.player.updateMany({
          where: { villages: { some: { id: defenderVillageId } } },
          data:  { totalPoints: { decrement: pointsExchanged } },
        });
        await tx.player.updateMany({
          where: { villages: { some: { id: attackerVillageId } } },
          data:  { totalPoints: { increment: pointsExchanged } },
        });

        // Rapport
        await tx.attackReport.create({
          data: {
            attackerVillageId, defenderVillageId,
            unitsSent:           units,
            unitsSurvived:       survivors,
            defenderUnitsBefore,
            defenderUnitsAfter:  Object.fromEntries(
              defenderGroups.map(u => [u.unitType, Math.max(0, u.count - (result.defenderLosses[u.unitType] ?? 0))])
            ),
            resourcesLooted:  loot,
            pointsLost:       pointsExchanged,
            pointsGained:     pointsExchanged,
            attackerWon:      result.attackerWon,
          },
        });

        // Mettre à jour le mouvement actif → returning si survivants, sinon supprimer
        if (Object.keys(survivors).length > 0) {
          // Même distance au retour → même durée
          const returnArrivesAt = new Date(Date.now() + (job.data as any).travelMs ?? 15000);
          await tx.activeAttack.update({
            where: { id: activeAttackId },
            data: {
              status:    'returning',
              survivors,
              arrivesAt: returnArrivesAt,
            },
          });
        } else {
          // Aucun survivant → supprimer directement
          await tx.activeAttack.delete({ where: { id: activeAttackId } });
        }
      });

      console.log(`✅ Combat résolu — ${result.attackerWon ? 'Victoire' : 'Défaite'}`);

      // Sockets
      fastify.io.to(`village:${attackerVillageId}`).emit('attack:result', {
        attackerWon: result.attackerWon, attackerLosses: result.attackerLosses,
        survivors, resourcesLooted: loot, pointsGained: pointsExchanged,
      });
      fastify.io.to(`village:${defenderVillageId}`).emit('attack:incoming', {
        attackerWon: result.attackerWon, defenderLosses: result.defenderLosses,
        resourcesLooted: loot, pointsLost: pointsExchanged, attackerVillageId,
      });

      // Job de retour si survivants
      if (Object.keys(survivors).length > 0) {
        const travelMs = (job.data as any).travelMs ?? 15000;
        await (fastify as any).attackQueue.addJob({
          attackerVillageId,
          defenderVillageId,
          units:          survivors,
          activeAttackId,
          returning:      true,
          travelMs,
        } as any, travelMs);
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job combat ${job?.id} échoué : ${err.message}`);
  });

  return worker;
}
