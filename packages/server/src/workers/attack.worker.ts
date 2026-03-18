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
      const { attackerVillageId, defenderVillageId, units } = job.data;

      console.log(`⚔️  Résolution du combat : ${attackerVillageId} → ${defenderVillageId}`);

      // 1. Récupérer les deux villages avec leurs troupes
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

      // 2. Construire les groupes d'unités pour le calcul
      const attackerGroups: UnitGroup[] = [];
      for (const [unitType, count] of Object.entries(units)) {
        if (count <= 0) continue;
        try {
          const def = fastify.gameData.getUnitDef(unitType);
          attackerGroups.push({
            unitType,
            count,
            attack:        def.attack,
            defense:       def.defense,
            carryCapacity: def.carryCapacity,
          });
        } catch { continue; }
      }

      const defenderGroups: UnitGroup[] = defenderVillage.troops
        .filter(t => t.count > 0)
        .map(t => {
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

      // 3. Résoudre le combat
      const result = resolveBattle(attackerGroups, defenderGroups);

      // 4. Calculer le pillage
      const loot = result.attackerWon
        ? calculateLoot(
            { wood: defenderVillage.wood, stone: defenderVillage.stone, iron: defenderVillage.iron },
            result.lootCapacity,
          )
        : { wood: 0, stone: 0, iron: 0 };

      // 5. Calculer les points échangés
      const pointsExchanged = calculatePointsExchanged(result.defenderLosses, defenderGroups);

      // 6. Snapshot des troupes défenseur avant le combat (pour le rapport)
      const defenderUnitsBefore = Object.fromEntries(
        defenderVillage.troops.map(t => [t.unitType, t.count])
      );

      // 7. Transaction : mettre à jour tout en BDD
      await fastify.prisma.$transaction(async (tx) => {

        // Mettre à jour les troupes attaquantes (déduire les pertes)
        for (const [unitType, lost] of Object.entries(result.attackerLosses)) {
          const originalCount = units[unitType] ?? 0;
          const survived      = originalCount - lost;
          await tx.troop.upsert({
            where:  { villageId_unitType: { villageId: attackerVillageId, unitType } },
            update: { count: { increment: survived } }, // Les survivants rentrent
            create: { villageId: attackerVillageId, unitType, count: survived },
          });
        }

        // Mettre à jour les troupes défenseur (déduire les pertes)
        for (const [unitType, lost] of Object.entries(result.defenderLosses)) {
          await tx.troop.updateMany({
            where: { villageId: defenderVillageId, unitType },
            data:  { count: { decrement: lost } },
          });
        }

        // Transférer les ressources pillées
        if (result.attackerWon && (loot.wood + loot.stone + loot.iron) > 0) {
          await tx.village.update({
            where: { id: defenderVillageId },
            data: {
              wood:  { decrement: loot.wood  },
              stone: { decrement: loot.stone },
              iron:  { decrement: loot.iron  },
              // Déduire les points proportionnellement aux pertes
              // (via le Player)
            },
          });
          await tx.village.update({
            where: { id: attackerVillageId },
            data: {
              wood:  { increment: loot.wood  },
              stone: { increment: loot.stone },
              iron:  { increment: loot.iron  },
            },
          });
        }

        // Mettre à jour les points du défenseur
        await tx.player.updateMany({
          where: { villages: { some: { id: defenderVillageId } } },
          data:  { totalPoints: { decrement: pointsExchanged } },
        });

        // Mettre à jour les points de l'attaquant
        await tx.player.updateMany({
          where: { villages: { some: { id: attackerVillageId } } },
          data:  { totalPoints: { increment: pointsExchanged } },
        });

        // Créer le rapport de combat
        await tx.attackReport.create({
          data: {
            attackerVillageId,
            defenderVillageId,
            unitsSent:           units,
            unitsSurvived:       Object.fromEntries(
              Object.entries(units).map(([type, count]) => [
                type,
                count - (result.attackerLosses[type] ?? 0),
              ])
            ),
            defenderUnitsBefore,
            defenderUnitsAfter:  Object.fromEntries(
              defenderGroups.map(u => [
                u.unitType,
                u.count - (result.defenderLosses[u.unitType] ?? 0),
              ])
            ),
            resourcesLooted:  loot,
            pointsLost:       pointsExchanged,
            pointsGained:     pointsExchanged,
            attackerWon:      result.attackerWon,
          },
        });
      });

      console.log(`✅ Combat résolu — ${result.attackerWon ? 'Attaquant gagne' : 'Défenseur résiste'}`);

      // 8. Notifier les deux joueurs via socket
      fastify.io.to(`village:${attackerVillageId}`).emit('attack:result', {
        attackerWon:     result.attackerWon,
        attackerLosses:  result.attackerLosses,
        resourcesLooted: loot,
        pointsGained:    pointsExchanged,
        defenderVillageId,
      });

      fastify.io.to(`village:${defenderVillageId}`).emit('attack:incoming', {
        attackerWon:      result.attackerWon,
        defenderLosses:   result.defenderLosses,
        resourcesLooted:  loot,
        pointsLost:       pointsExchanged,
        attackerVillageId,
      });
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job combat ${job?.id} échoué : ${err.message}`);
  });

  return worker;
}
