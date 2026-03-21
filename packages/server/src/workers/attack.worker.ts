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

// ─────────────────────────────────────────────────────────────
//  Attack Worker — Phase 1 patch
//  Ajouts : Bonus Mur (wallLevel) + Morale (totalPoints)
//           + Vérification bouclier débutant (shieldUntil)
// ─────────────────────────────────────────────────────────────

function safeEmit(fastify: FastifyInstance, room: string, event: string, data: any) {
  try { fastify.io.to(room).emit(event, data); }
  catch (e) { console.warn(`⚠️ Socket emit échoué sur ${room}/${event}:`, e); }
}

export function initAttackWorker(fastify: FastifyInstance) {
  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<AttackJobData>(
    'attacks',
    async (job: Job<AttackJobData>) => {
      const { attackerVillageId, defenderVillageId, activeAttackId } = job.data;

      // ── CAS 1 : RETOUR DES TROUPES ──────────────────────────
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

        try { await fastify.prisma.activeAttack.delete({ where: { id: activeAttackId } }); }
        catch { /* déjà supprimé */ }

        safeEmit(fastify, `village:${attackerVillageId}`, 'troops:returned', {
          survivors,
          message: 'Vos troupes sont rentrées à la base !',
        });
        return;
      }

      // ── CAS 2 : RÉSOLUTION DU COMBAT ────────────────────────
      const { units } = job.data;
      console.log(`⚔️  Combat : ${attackerVillageId} → ${defenderVillageId}`);

      const [attackerVillage, defenderVillage] = await Promise.all([
        fastify.prisma.village.findUnique({
          where:   { id: attackerVillageId },
          include: { troops: true },
        }),
        fastify.prisma.village.findUnique({
          where:   { id: defenderVillageId },
          include: {
            troops:    true,
            buildings: true, // ← pour lire le niveau du mur depuis BuildingInstance
          },
        }),
      ]);

      if (!attackerVillage || !defenderVillage) {
        console.error('❌ Village introuvable'); return;
      }

      // ── Vérification bouclier débutant ───────────────────────
      const shieldUntil = (defenderVillage as any).shieldUntil as Date | null;
      if (shieldUntil && shieldUntil > new Date()) {
        console.log(`🛡️ Village ${defenderVillageId} protégé jusqu'au ${shieldUntil.toISOString()}`);

        // Renvoyer les troupes sans combat
        const travelMs = job.data.travelMs ?? 15000;
        await fastify.prisma.activeAttack.update({
          where: { id: activeAttackId },
          data:  { status: 'returning', survivors: units, arrivesAt: new Date(Date.now() + travelMs) },
        });

        safeEmit(fastify, `village:${attackerVillageId}`, 'attack:bounced', {
          reason: 'Le village cible est protégé par un bouclier débutant.',
          defenderVillageId,
        });

        // Planifier le retour des troupes
        await (fastify as any).attackQueue.addJob({
          attackerVillageId, defenderVillageId,
          units, activeAttackId, returning: true, travelMs, survivors: units,
        }, travelMs);
        return;
      }

      const isAbandonedTarget = (defenderVillage as any).isAbandoned === true;

      // ── Groupes d'unités attaquants ──────────────────────────
      const attackerGroups: UnitGroup[] = [];
      for (const [unitType, count] of Object.entries(units)) {
        if (count <= 0) continue;
        try {
          const def = fastify.gameData.getUnitDef(unitType);
          attackerGroups.push({ unitType, count, attack: def.attack, defense: def.defense, carryCapacity: def.carryCapacity });
        } catch { continue; }
      }

      const defGroups: UnitGroup[] = isAbandonedTarget
        ? []
        : ((defenderVillage as any).troops ?? [])
            .filter((t: any) => t.count > 0)
            .map((t: any) => {
              try {
                const def = fastify.gameData.getUnitDef(t.unitType);
                return { unitType: t.unitType, count: t.count, attack: def.attack, defense: def.defense, carryCapacity: def.carryCapacity };
              } catch { return null; }
            })
            .filter(Boolean) as UnitGroup[];

      // ── Points joueurs pour la morale ────────────────────────
      const [atkPlayer, defPlayer] = await Promise.all([
        fastify.prisma.player.findFirst({
          where:  { villages: { some: { id: attackerVillageId } } },
          select: { totalPoints: true },
        }),
        fastify.prisma.player.findFirst({
          where:  { villages: { some: { id: defenderVillageId } } },
          select: { totalPoints: true },
        }),
      ]);

      // ── Résolution du combat (mur + morale) ─────────────────
      // Lire le niveau du mur depuis BuildingInstance (pas la colonne wallLevel)
      const wallLevel = ((defenderVillage as any).buildings ?? [])
        .find((b: any) => b.buildingId === 'wall')?.level ?? 0;

      const result = resolveBattle(attackerGroups, defGroups, {
        wallLevel,
        attackerPoints: atkPlayer?.totalPoints ?? 1,
        defenderPoints: defPlayer?.totalPoints ?? 1,
      });

      const loot = result.attackerWon
        ? calculateLoot(
            { wood: defenderVillage.wood, stone: defenderVillage.stone, iron: defenderVillage.iron },
            result.lootCapacity,
          )
        : { wood: 0, stone: 0, iron: 0 };

      const pointsExchanged = isAbandonedTarget
        ? 0
        : calculatePointsExchanged(result.defenderLosses, defGroups);

      const survivors: Record<string, number> = {};
      for (const [unitType, count] of Object.entries(units)) {
        const survived = Math.max(0, count - (result.attackerLosses[unitType] ?? 0));
        if (survived > 0) survivors[unitType] = survived;
      }

      const defenderUnitsBefore = Object.fromEntries(
        ((defenderVillage as any).troops ?? []).map((t: any) => [t.unitType, t.count])
      );

      // ── Transaction BDD ──────────────────────────────────────
      await fastify.prisma.$transaction(async (tx: any) => {
        // Pertes défenseur
        if (!isAbandonedTarget) {
          for (const [unitType, lost] of Object.entries(result.defenderLosses)) {
            if (lost <= 0) continue;
            await tx.troop.updateMany({
              where: { villageId: defenderVillageId, unitType },
              data:  { count: { decrement: lost } },
            });
          }
        }

        // Ressources pillées
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

        // Points généraux + points attaque/défense séparés
        if (!isAbandonedTarget && pointsExchanged > 0) {
          await tx.player.updateMany({
            where: { villages: { some: { id: defenderVillageId } } },
            data:  { totalPoints: { decrement: pointsExchanged } },
          });
          await tx.player.updateMany({
            where: { villages: { some: { id: attackerVillageId } } },
            data:  {
              totalPoints:   { increment: pointsExchanged },
              attackPoints:  { increment: pointsExchanged }, // ← NOUVEAU
            },
          });
          // Points de défense pour le perdant (même en perdant on gagne des pts défense)
          if (!result.attackerWon) {
            await tx.player.updateMany({
              where: { villages: { some: { id: defenderVillageId } } },
              data:  { defensePoints: { increment: pointsExchanged } }, // ← NOUVEAU
            });
          }
        }

        // Rapport de combat (avec morale + wallBonus) ← NOUVEAU
        await tx.attackReport.create({
          data: {
            attackerVillageId,
            defenderVillageId,
            unitsSent:           units,
            unitsSurvived:       survivors,
            defenderUnitsBefore,
            defenderUnitsAfter:  Object.fromEntries(
              defGroups.map(u => [u.unitType, Math.max(0, u.count - (result.defenderLosses[u.unitType] ?? 0))])
            ),
            resourcesLooted:  loot,
            morale:           result.morale,      // ← NOUVEAU
            wallBonus:        result.wallBonus,   // ← NOUVEAU
            pointsLost:       pointsExchanged,
            pointsGained:     isAbandonedTarget ? 1 : pointsExchanged,
            attackerWon:      result.attackerWon,
          },
        });

        // Statut du mouvement actif
        const travelMs = job.data.travelMs ?? 15000;
        if (Object.keys(survivors).length > 0) {
          await tx.activeAttack.update({
            where: { id: activeAttackId },
            data:  { status: 'returning', survivors, arrivesAt: new Date(Date.now() + travelMs) },
          });
        } else {
          await tx.activeAttack.delete({ where: { id: activeAttackId } });
        }
      });

      // Régénération village abandonné pillé
      if (isAbandonedTarget && result.attackerWon) {
        await (fastify as any).abandonedService.resetAfterRaid(defenderVillageId);
      }

      console.log(
        `✅ Combat résolu — ${result.attackerWon ? 'Victoire' : 'Défaite'} | ` +
        `Morale: ${Math.round(result.morale * 100)}% | Mur: ×${result.wallBonus.toFixed(2)} | ` +
        `Butin: ${loot.wood}🪵 ${loot.stone}🪨 ${loot.iron}⚙️`
      );

      // Notifications Socket
      safeEmit(fastify, `village:${attackerVillageId}`, 'attack:result', {
        attackerWon:      result.attackerWon,
        attackerLosses:   result.attackerLosses,
        survivors,
        resourcesLooted:  loot,
        pointsGained:     isAbandonedTarget ? 1 : pointsExchanged,
        morale:           result.morale,
        wallBonus:        result.wallBonus,
        isAbandonedTarget,
      });

      if (!isAbandonedTarget) {
        safeEmit(fastify, `village:${defenderVillageId}`, 'attack:incoming', {
          attackerWon:     result.attackerWon,
          defenderLosses:  result.defenderLosses,
          resourcesLooted: loot,
          pointsLost:      pointsExchanged,
          wallBonus:       result.wallBonus,
          attackerVillageId,
        });
      }

      // Job de retour des survivants
      if (Object.keys(survivors).length > 0) {
        const travelMs = job.data.travelMs ?? 15000;
        await (fastify as any).attackQueue.addJob({
          attackerVillageId, defenderVillageId,
          units:     survivors,
          activeAttackId,
          returning: true,
          travelMs,
          survivors,
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
