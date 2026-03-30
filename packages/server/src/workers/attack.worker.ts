import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { AttackJobData } from '../engine/queue/queues/attack.queue';
import { io } from '../infra/ws/socket.server';
import {
  resolveBattle,
  calculateLoot,
  resolveScout,
  computeSiegeDamages,
  calculateVillagePoints,
  UnitGroup,
} from '@mmorts/shared';

// ─────────────────────────────────────────────────────────────
//  Attack Worker — Phase 1 patch
//  Ajouts : Bonus Mur (wallLevel) + Morale (totalPoints)
//           + Vérification bouclier débutant (shieldUntil)
// ─────────────────────────────────────────────────────────────

function safeEmit(_fastify: FastifyInstance, room: string, event: string, data: any) {
  try {
    if (!io) { console.warn(`⚠️ Socket non initialisé, emit ignoré sur ${room}/${event}`); return; }
    io.to(room).emit(event, data);
  } catch (e) { console.warn(`⚠️ Socket emit échoué sur ${room}/${event}:`, e); }
}

// ─────────────────────────────────────────────────────────────
//  Résolution d'une mission d'espionnage
//
//  Logique :
//  1. Lit les scouts défenseurs présents dans le village cible.
//  2. Appelle resolveScout() (formule courbe de puissance).
//  3. Met à jour les troupes des deux villages (pertes).
//  4. Si succès (tier >= 1) → construit le ScoutReport selon le palier :
//       tier 1 : ressources + troupes stationnées
//       tier 2 : + niveaux des bâtiments
//       tier 3 : + troupes à l'extérieur (ActiveAttacks en déplacement)
//  5. Notifie l'attaquant (rapport ou échec).
//  6. Notifie le défenseur uniquement si detectedByDefender === true,
//     sans révéler les troupes adverses.
// ─────────────────────────────────────────────────────────────
async function resolveScoutMission(
  fastify: FastifyInstance,
  jobData: AttackJobData,
) {
  const { attackerVillageId, defenderVillageId, activeAttackId, travelMs } = jobData;
  const scoutsSent = jobData.units['scout'] ?? 0;

  console.log(`🔍 Espionnage : ${attackerVillageId} → ${defenderVillageId} (${scoutsSent} éclaireurs)`);

  // ── 1. Lecture des données cible + attaquant ──────────────
  const [defenderVillage, attackerVillage_] = await Promise.all([
    fastify.prisma.village.findUnique({
      where:   { id: defenderVillageId },
      include: { troops: true, buildings: true },
    }),
    fastify.prisma.village.findUnique({
      where:  { id: attackerVillageId },
      select: { playerId: true },
    }),
  ]);

  if (!defenderVillage) {
    console.error(`❌ Village cible ${defenderVillageId} introuvable`);
    return;
  }

  // Bouclier débutant : renvoie les scouts sans combat ni rapport
  const shieldUntil = (defenderVillage as any).shieldUntil as Date | null;
  if (shieldUntil && shieldUntil > new Date()) {
    const returnMs = travelMs ?? 15000;
    await fastify.prisma.activeAttack.update({
      where: { id: activeAttackId },
      data:  { status: 'returning', survivors: { scout: scoutsSent }, arrivesAt: new Date(Date.now() + returnMs) },
    });
    await (fastify as any).attackQueue.addJob(
      { attackerVillageId, defenderVillageId, units: { scout: scoutsSent }, activeAttackId, returning: true, travelMs: returnMs, survivors: { scout: scoutsSent } },
      returnMs,
    );
    safeEmit(fastify, `village:${attackerVillageId}`, 'scout:bounced', {
      reason: 'Le village cible est protégé par un bouclier débutant.',
    });
    return;
  }

  const troopMap: Record<string, number> = Object.fromEntries(
    ((defenderVillage as any).troops ?? []).map((t: any) => [t.unitType, t.count])
  );
  const scoutsDef = troopMap['scout'] ?? 0;

  // ── 2. Résolution du combat d'espionnage ──────────────────
  const result = resolveScout(scoutsSent, scoutsDef);

  // ── 3. Mise à jour des troupes ────────────────────────────
  await fastify.prisma.$transaction(async (tx: any) => {

    // Pertes attaquant : les scouts morts ne rentrent pas
    if (result.scoutsLost > 0) {
      // Les scouts ont déjà été déduits au départ → on les a dans units.
      // Ici on ne recrédite que les survivants (au retour).
      // Pas d'update nécessaire maintenant : le retour les re-crédite.
    }

    // Pertes défenseur : on décrémente ses scouts
    if (result.defenderScoutsKilled > 0) {
      await tx.troop.updateMany({
        where: { villageId: defenderVillageId, unitType: 'scout' },
        data:  { count: { decrement: result.defenderScoutsKilled } },
      });
    }

    // ── 4. Rapport d'espionnage (toujours créé, même tier 0) ──
    // Palier 1+ : ressources + troupes stationnées
    let resources: Record<string, number> | null = null;
    let troopsAtHome: Record<string, number> | null = null;
    if (result.tier >= 1) {
      resources = {
        wood:  Math.floor(defenderVillage.wood),
        stone: Math.floor(defenderVillage.stone),
        iron:  Math.floor(defenderVillage.iron),
        food:  Math.floor(defenderVillage.food),
      };
      troopsAtHome = {};
      for (const t of (defenderVillage as any).troops ?? []) {
        if (t.count > 0) troopsAtHome[t.unitType] = t.count;
      }
    }

    // Palier 2 : niveaux des bâtiments
    let buildings: Record<string, number> | null = null;
    if (result.tier >= 2) {
      buildings = {};
      for (const b of (defenderVillage as any).buildings ?? []) {
        if (b.level > 0) buildings[b.buildingId] = b.level;
      }
    }

    // Palier 3 : troupes à l'extérieur (ActiveAttacks en déplacement)
    let troopsOutside: Record<string, number> | null = null;
    if (result.tier >= 3) {
      const outgoing = await tx.activeAttack.findMany({
        where: {
          attackerVillageId: defenderVillageId,
          status:            'traveling',
        },
        select: { units: true },
      });
      troopsOutside = {};
      for (const a of outgoing) {
        const unitMap = a.units as Record<string, number>;
        for (const [unitType, count] of Object.entries(unitMap)) {
          troopsOutside[unitType] = (troopsOutside[unitType] ?? 0) + count;
        }
      }
    }

    await tx.combatReport.create({
      data: {
        type:                 'scout',
        attackerVillageId,
        defenderVillageId,
        scoutsSent:           result.scoutsSent,
        scoutsLost:           result.scoutsLost,
        scoutsSurvived:       result.scoutsSurvived,
        survivorRatio:        result.survivorRatio,
        tier:                 result.tier,
        defenderScoutsKilled: result.defenderScoutsKilled,
        scoutResources:       resources,
        troopsAtHome,
        buildings,
        troopsOutside,
        // Loyauté visible à partir du tier 2
        ...(result.tier >= 2 ? { loyaltyBefore: (defenderVillage as any).loyaltyPoints ?? 100 } : {}),
        // IDs joueurs immuables (pour accès post-conquête)
        attackerPlayerId: attackerVillage_?.playerId ?? null,
        defenderPlayerId: (defenderVillage as any).playerId ?? null,
      },
    });
    console.log(`🔍 Rapport espionnage (Palier ${result.tier}) — ${result.scoutsSurvived}/${result.scoutsSent} survivants, ${result.defenderScoutsKilled} scouts défenseurs tués`);

    // Statut de l'attaque active
    const returnMs = travelMs ?? 15000;
    if (result.scoutsSurvived > 0) {
      await tx.activeAttack.update({
        where: { id: activeAttackId },
        data:  { status: 'returning', survivors: { scout: result.scoutsSurvived }, arrivesAt: new Date(Date.now() + returnMs) },
      });
    } else {
      await tx.activeAttack.delete({ where: { id: activeAttackId } });
    }
  });

  // ── 5. Planifier le retour des survivants ─────────────────
  if (result.scoutsSurvived > 0) {
    const returnMs = travelMs ?? 15000;
    await (fastify as any).attackQueue.addJob(
      {
        attackerVillageId, defenderVillageId,
        units:          { scout: result.scoutsSurvived },
        activeAttackId,
        returning:      true,
        travelMs:       returnMs,
        survivors:      { scout: result.scoutsSurvived },
      },
      returnMs,
    );
  }

  // ── 6. Notifications Socket ───────────────────────────────
  if (result.tier >= 1) {
    safeEmit(fastify, `village:${attackerVillageId}`, 'scout:result', {
      success:       true,
      tier:          result.tier,
      scoutsSent:    result.scoutsSent,
      scoutsLost:    result.scoutsLost,
      scoutsSurvived: result.scoutsSurvived,
      survivorRatio: result.survivorRatio,
    });
  } else {
    // Échec total : tous les scouts sont morts
    safeEmit(fastify, `village:${attackerVillageId}`, 'scout:result', {
      success:    false,
      tier:       0,
      scoutsSent: result.scoutsSent,
      scoutsLost: result.scoutsLost,
    });
  }

  // Notification défenseur (sans info sur l'attaquant)
  if (result.defenderDetected) {
    const eventName = result.tier === 0 ? 'scout:blocked' : 'scout:detected';
    safeEmit(fastify, `village:${defenderVillageId}`, eventName, {
      defenderScoutsKilled: result.defenderScoutsKilled,
      // Intentionnellement : aucune info sur l'attaquant ni son nombre de scouts
    });
  }

  console.log(
    `🔍 Espionnage résolu — Palier ${result.tier} | ` +
    `${result.scoutsSurvived}/${result.scoutsSent} scouts survivants | ` +
    `Def scouts tués: ${result.defenderScoutsKilled}`,
  );
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
        const loot      = job.data.loot ?? { wood: 0, stone: 0, iron: 0 };

        await fastify.prisma.$transaction(async (tx: any) => {
          // Recréditer les troupes
          for (const [unitType, count] of Object.entries(survivors)) {
            if (count <= 0) continue;
            await tx.troop.upsert({
              where:  { villageId_unitType: { villageId: attackerVillageId, unitType } },
              update: { count: { increment: count } },
              create: { villageId: attackerVillageId, unitType, count },
            });
          }
          // Créditer le pillage au retour
          if (loot.wood + loot.stone + loot.iron > 0) {
            await tx.village.update({
              where: { id: attackerVillageId },
              data:  { wood: { increment: loot.wood }, stone: { increment: loot.stone }, iron: { increment: loot.iron } },
            });
          }
          try { await tx.activeAttack.delete({ where: { id: activeAttackId } }); }
          catch { /* déjà supprimé */ }
        });

        safeEmit(fastify, `village:${attackerVillageId}`, 'troops:returned', {
          survivors,
          loot,
          message: loot.wood + loot.stone + loot.iron > 0
            ? `Vos troupes sont rentrées avec ${loot.wood}🪵 ${loot.stone}🪨 ${loot.iron}⚙️ !`
            : 'Vos troupes sont rentrées à la base !',
        });
        return;
      }

      // ── CAS 2 : RÉSOLUTION ESPIONNAGE ───────────────────────
      // Scout dédié OU attaque ne contenant que des scouts → formule resolveScout
      const isScoutOnlyAttack = Object.keys(job.data.units).every(u => u === 'scout');
      if (job.data.missionType === 'scout' || isScoutOnlyAttack) {
        await resolveScoutMission(fastify, job.data);
        return;
      }

      // ── CAS 3 : RÉSOLUTION DU COMBAT ────────────────────────
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

      // ── Sous-combat scouts (séparé du combat principal) ──────
      // Dans TW, les scouts ne participent pas au combat principal :
      // ils se battent uniquement contre les scouts adverses via resolveScout().
      const scoutsSentInAttack = units['scout'] ?? 0;
      const defenderTroopMap: Record<string, number> = Object.fromEntries(
        ((defenderVillage as any).troops ?? []).map((t: any) => [t.unitType, t.count])
      );
      const defenderScoutsCount = defenderTroopMap['scout'] ?? 0;
      const scoutSubResult = scoutsSentInAttack > 0
        ? resolveScout(scoutsSentInAttack, defenderScoutsCount)
        : null;

      // ── Groupes d'unités attaquants (scouts exclus) ──────────
      const attackerGroups: UnitGroup[] = [];
      for (const [unitType, count] of Object.entries(units)) {
        if (count <= 0 || unitType === 'scout') continue; // scouts → sous-combat
        try {
          const def = fastify.gameData.getUnitDef(unitType);
          attackerGroups.push({
            unitType,
            count,
            attack:         def.attack,
            defenseGeneral: def.defenseGeneral,
            defenseCavalry: def.defenseCavalry,
            defenseArcher:  def.defenseArcher,
            carryCapacity:  def.carryCapacity,
            category:       def.category,
          });
        } catch { continue; }
      }

      // Nombre de béliers attaquants (pour la réduction du mur)
      const ramCount = attackerGroups.find(g => g.unitType === 'ram')?.count ?? 0;

      // ── Troupes de garnison stationnées (renforts alliés) ────
      const stationedSupports = isAbandonedTarget ? [] : await fastify.prisma.activeSupport.findMany({
        where: { toVillageId: defenderVillageId, status: 'stationed' },
      });
      // Fusionner les troupes locales + garnison en une seule map
      const defTroopMap: Record<string, number> = {};
      for (const t of (defenderVillage as any).troops ?? []) {
        if (t.count > 0) defTroopMap[t.unitType] = (defTroopMap[t.unitType] ?? 0) + t.count;
      }
      for (const s of stationedSupports) {
        for (const [unitType, count] of Object.entries(s.units as Record<string, number>)) {
          if (count > 0) defTroopMap[unitType] = (defTroopMap[unitType] ?? 0) + count;
        }
      }

      const defGroups: UnitGroup[] = isAbandonedTarget
        ? []
        : Object.entries(defTroopMap)
            .filter(([unitType, count]) => count > 0 && unitType !== 'scout')
            .map(([unitType, count]) => {
              try {
                const def = fastify.gameData.getUnitDef(unitType);
                return {
                  unitType,
                  count,
                  attack:         def.attack,
                  defenseGeneral: def.defenseGeneral,
                  defenseCavalry: def.defenseCavalry,
                  defenseArcher:  def.defenseArcher,
                  carryCapacity:  def.carryCapacity,
                  category:       def.category,
                };
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
        ramCount,
        attackerPoints: atkPlayer?.totalPoints ?? 1,
        defenderPoints: defPlayer?.totalPoints ?? 1,
      });

      const loot = result.attackerWon
        ? calculateLoot(
            { wood: defenderVillage.wood, stone: defenderVillage.stone, iron: defenderVillage.iron },
            result.lootCapacity,
          )
        : { wood: 0, stone: 0, iron: 0 };

      // ── Calcul des unités tuées (pour les stats) ─────────────
      const killedByAttacker = Object.values(result.defenderLosses).reduce((s, v) => s + v, 0);
      const killedByDefender = Object.values(result.attackerLosses).reduce((s, v) => s + v, 0);

      const survivors: Record<string, number> = {};
      for (const [unitType, count] of Object.entries(units)) {
        if (unitType === 'scout') continue; // traité via scoutSubResult
        const survived = Math.max(0, count - (result.attackerLosses[unitType] ?? 0));
        if (survived > 0) survivors[unitType] = survived;
      }
      // Ajouter les scouts survivants du sous-combat
      if (scoutSubResult && scoutSubResult.scoutsSurvived > 0) {
        survivors['scout'] = scoutSubResult.scoutsSurvived;
      }

      const defenderUnitsBefore = Object.fromEntries(
        ((defenderVillage as any).troops ?? []).map((t: any) => [t.unitType, t.count])
      );

      // ── Dégâts de siège permanents (post-combat) ─────────────
      // Calculés uniquement si l'attaquant a gagné.
      const catapultTarget: string | undefined = job.data.catapultTarget;
      const survivingRams = result.attackerWon ? (survivors['ram'] ?? 0) : 0;
      const initialCats   = units['catapult'] ?? 0;
      const lostCats      = result.attackerWon ? (result.attackerLosses['catapult'] ?? 0) : initialCats;

      const buildingLevels: Record<string, number> = {};
      for (const b of (defenderVillage as any).buildings ?? []) {
        buildingLevels[b.buildingId] = b.level;
      }

      const siegeDamages = computeSiegeDamages(
        survivingRams, initialCats, lostCats, catapultTarget, buildingLevels,
      );
      const hasSiegeDamage = Object.keys(siegeDamages).length > 0;

      // ── Résolution Noble (loyauté) — 1 noble max par attaque ──
      const noblesCount            = units['noble'] ?? 0;
      let loyaltyBefore:           number | null = null;
      let loyaltyAfter:            number | null = null;
      let isConquest                             = false;
      let formerDefenderPlayerId:  string | null = null;

      if (noblesCount > 0 && result.attackerWon && !isAbandonedTarget) {
        loyaltyBefore           = (defenderVillage as any).loyaltyPoints ?? 100;
        formerDefenderPlayerId  = (defenderVillage as any).playerId ?? null;
        // 1 seul noble agit, quel que soit le nombre envoyé
        const reduction  = Math.floor(Math.random() * 16) + 20; // 20–35
        loyaltyAfter     = Math.max(0, (loyaltyBefore as number) - reduction);
        isConquest       = loyaltyAfter <= 0;
        console.log(`👑 Noble : loyauté ${loyaltyBefore} → ${loyaltyAfter} (${isConquest ? 'CONQUÊTE !' : '-' + reduction})`);
      }

      // Transaction BDD ──────────────────────────────────────
      await fastify.prisma.$transaction(async (tx: any) => {
        // Pertes défenseur (combat principal — scouts exclus)
        if (!isAbandonedTarget) {
          for (const [unitType, lost] of Object.entries(result.defenderLosses)) {
            if (lost <= 0) continue;
            await tx.troop.updateMany({
              where: { villageId: defenderVillageId, unitType },
              data:  { count: { decrement: lost } },
            });
          }
          // Pertes scouts défenseur (sous-combat scout)
          if (scoutSubResult && scoutSubResult.defenderScoutsKilled > 0) {
            await tx.troop.updateMany({
              where: { villageId: defenderVillageId, unitType: 'scout' },
              data:  { count: { decrement: scoutSubResult.defenderScoutsKilled } },
            });
          }
        }

        // Ressources pillées — déduites du défenseur maintenant,
        // créditées à l'attaquant uniquement au retour des troupes
        if (result.attackerWon && (loot.wood + loot.stone + loot.iron) > 0) {
          await tx.village.update({
            where: { id: defenderVillageId },
            data:  { wood: { decrement: loot.wood }, stone: { decrement: loot.stone }, iron: { decrement: loot.iron } },
          });
        }

        // ── Statistiques de combat (sans toucher aux totalPoints) ──
        // totalPoints = basé sur bâtiments (mis à jour par build.worker)
        // attackPoints / defensePoints = stats de combat pures
        if (!isAbandonedTarget) {
          if (killedByAttacker > 0) {
            await tx.player.updateMany({
              where: { villages: { some: { id: attackerVillageId } } },
              data:  { attackPoints: { increment: killedByAttacker } },
            });
          }
          if (killedByDefender > 0) {
            await tx.player.updateMany({
              where: { villages: { some: { id: defenderVillageId } } },
              data:  { defensePoints: { increment: killedByDefender } },
            });
          }
        }

        // ── Rapport unifié (combat + scout éventuel) ─────────────
        const defenderUnitsAfterMap = {
          ...Object.fromEntries(
            defGroups.map(u => [u.unitType, Math.max(0, u.count - (result.defenderLosses[u.unitType] ?? 0))])
          ),
          ...(defenderScoutsCount > 0 ? {
            scout: Math.max(0, defenderScoutsCount - (scoutSubResult?.defenderScoutsKilled ?? 0)),
          } : {}),
        };

        // Données scout du sous-combat (null si aucun scout dans l'attaque)
        let scoutResources:    Record<string, number> | null = null;
        let scoutTroopsAtHome: Record<string, number> | null = null;
        let scoutBuildings:    Record<string, number> | null = null;
        let scoutTroopsOutside: Record<string, number> | null = null;
        if (scoutSubResult) {
          const { tier } = scoutSubResult;
          if (tier >= 1) {
            scoutResources = {
              wood:  Math.floor(defenderVillage.wood),
              stone: Math.floor(defenderVillage.stone),
              iron:  Math.floor(defenderVillage.iron),
            };
            scoutTroopsAtHome = {};
            for (const t of (defenderVillage as any).troops ?? []) {
              if (t.count > 0) scoutTroopsAtHome[t.unitType] = t.count;
            }
          }
          if (tier >= 2) {
            scoutBuildings = {};
            for (const b of (defenderVillage as any).buildings ?? []) {
              if (b.level > 0) scoutBuildings[b.buildingId] = b.level;
            }
          }
          if (tier >= 3) {
            const outgoing = await tx.activeAttack.findMany({
              where:  { attackerVillageId: defenderVillageId, status: 'traveling' },
              select: { units: true },
            });
            scoutTroopsOutside = {};
            for (const a of outgoing) {
              for (const [unitType, count] of Object.entries(a.units as Record<string, number>)) {
                scoutTroopsOutside[unitType] = (scoutTroopsOutside[unitType] ?? 0) + count;
              }
            }
          }
          console.log(`🔍 Scout (Palier ${tier}) — ${scoutSubResult.scoutsSurvived}/${scoutsSentInAttack} revenus, ${scoutSubResult.defenderScoutsKilled} scouts défenseurs éliminés`);
        }

        // ── Noble : loyauté + conquest ────────────────────────────
        if (loyaltyBefore !== null && loyaltyAfter !== null) {
          if (isConquest) {
            // Trouver le joueur attaquant
            const atkPlayer = await tx.player.findFirst({
              where:  { villages: { some: { id: attackerVillageId } } },
              select: { id: true },
            });
            // Changer le propriétaire, reset loyauté
            await tx.village.update({
              where: { id: defenderVillageId },
              data:  { playerId: atkPlayer!.id, loyaltyPoints: 100 },
            });
            // 1 noble meurt dans la conquête
            const currentNobles = survivors['noble'] ?? 0;
            if (currentNobles <= 1) {
              delete survivors['noble'];
            } else {
              survivors['noble'] = currentNobles - 1;
            }
          } else {
            await tx.village.update({
              where: { id: defenderVillageId },
              data:  { loyaltyPoints: loyaltyAfter },
            });
          }
        }

        // ── Dégâts de siège → mise à jour des bâtiments ──────────
        if (hasSiegeDamage) {
          for (const [buildingId, { to }] of Object.entries(siegeDamages)) {
            await tx.buildingInstance.updateMany({
              where: { villageId: defenderVillageId, buildingId },
              data:  { level: to },
            });
          }
          if (siegeDamages['wall'] !== undefined) {
            console.log(
              `🏰 Mur endommagé : niveau ${siegeDamages['wall'].from} → ${siegeDamages['wall'].to} ` +
              `(${survivingRams} béliers, ${initialCats - lostCats} catapultes survivantes)`
            );
          }
        }

        await tx.combatReport.create({
          data: {
            type: isConquest ? 'conquest' : (scoutSubResult ? 'combined' : 'attack'),
            ...(loyaltyBefore !== null ? { loyaltyBefore, loyaltyAfter } : {}),
            // IDs joueurs au moment du rapport — immuables même après conquête
            attackerPlayerId: (attackerVillage as any).playerId ?? null,
            defenderPlayerId: formerDefenderPlayerId ?? (defenderVillage as any).playerId ?? null,
            attackerVillageId,
            defenderVillageId,
            unitsSent:            units,
            unitsSurvived:        survivors,
            defenderUnitsBefore,
            defenderUnitsAfter:   defenderUnitsAfterMap,
            resourcesLooted:      loot,
            morale:               result.morale,
            wallBonus:            result.wallBonus,
            pointsLost:           0,
            pointsGained:         0,
            attackerWon:          result.attackerWon,
            ...(hasSiegeDamage ? { buildingDamages: siegeDamages } : {}),
            ...(scoutSubResult ? {
              scoutsSent:           scoutsSentInAttack,
              scoutsLost:           scoutSubResult.scoutsLost,
              scoutsSurvived:       scoutSubResult.scoutsSurvived,
              survivorRatio:        scoutSubResult.survivorRatio,
              tier:                 scoutSubResult.tier,
              defenderScoutsKilled: scoutSubResult.defenderScoutsKilled,
              scoutResources,
              troopsAtHome:         scoutTroopsAtHome,
              buildings:            scoutBuildings,
              troopsOutside:        scoutTroopsOutside,
            } : {}),
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

      // ── Points après conquête ────────────────────────────────────
      if (isConquest) {
        // Vérifier si la partie est finie (Phase 11)
        const gameEnd = await fastify.gameEndService.checkGameEnd(defenderVillageId, attackerVillageId);
        if (gameEnd?.gameId) {
          safeEmit(fastify, `game:${gameEnd.gameId}`, 'game:over', { winnerId: gameEnd.winnerId });
        }

        // Recalculer les totalPoints pour les deux joueurs
        const [atkVillages, defVillages] = await Promise.all([
          fastify.prisma.village.findMany({
            where:   { player: { villages: { some: { id: attackerVillageId } } } },
            include: { buildings: true },
          }),
          formerDefenderPlayerId
            ? fastify.prisma.village.findMany({
                where:   { playerId: formerDefenderPlayerId },
                include: { buildings: true },
              })
            : Promise.resolve([]),
        ]);
        const sumPoints = (villages: any[]) => villages.reduce((sum, v) => sum + calculateVillagePoints(
          v.buildings as { buildingId: string; level: number }[],
          (id: string) => { try { return fastify.gameData.getBuildingDef(id); } catch { return null; } },
        ), 0);
        const [atkPoints, defPoints] = [sumPoints(atkVillages), sumPoints(defVillages)];
        const atkPlayerId = atkVillages[0]?.playerId;
        if (atkPlayerId) {
          await fastify.prisma.player.update({ where: { id: atkPlayerId }, data: { totalPoints: atkPoints } });
        }
        if (formerDefenderPlayerId) {
          await fastify.prisma.player.update({ where: { id: formerDefenderPlayerId }, data: { totalPoints: defPoints } });
        }
        console.log(`📊 Points recalculés après conquête — attaquant: ${atkPoints}, ancien défenseur: ${defPoints}`);
      }

      // ── Alerte loyauté < 50 (sans conquête) ──────────────────────
      if (loyaltyAfter !== null && !isConquest && loyaltyBefore !== null && loyaltyAfter < 50 && loyaltyBefore >= 50) {
        safeEmit(fastify, `village:${defenderVillageId}`, 'loyalty:warning', {
          loyalty:     loyaltyAfter,
          villageName: (defenderVillage as any).name ?? '',
        });
      }

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
        morale:           result.morale,
        wallBonus:        result.wallBonus,
        isAbandonedTarget,
      });

      if (!isAbandonedTarget) {
        safeEmit(fastify, `village:${defenderVillageId}`, 'attack:incoming', {
          attackerWon:     result.attackerWon,
          defenderLosses:  result.defenderLosses,
          resourcesLooted: loot,
          wallBonus:       result.wallBonus,
          attackerVillageId,
          ...(loyaltyAfter !== null ? { loyaltyBefore, loyaltyAfter, isConquest } : {}),
        });
        if (isConquest) {
          safeEmit(fastify, `village:${defenderVillageId}`, 'village:conquered', {
            newOwnerVillageId: attackerVillageId,
          });

          // Si le village conquis était un bot → respawn automatique
          // Si l'attaquant est un bot → démarrer un BotBrain pour le village conquis
          const [conqueredVillage, attackerVillage] = await Promise.all([
            fastify.prisma.village.findUnique({
              where:  { id: defenderVillageId },
              select: { isBot: true },
            }),
            fastify.prisma.village.findUnique({
              where:  { id: attackerVillageId },
              select: { isBot: true },
            }),
          ]);
          if (conqueredVillage?.isBot) {
            fastify.botService.onBotConquered(defenderVillageId).catch((err: any) =>
              console.error('[AttackWorker] Erreur respawn bot :', err),
            );
          }
          if (attackerVillage?.isBot) {
            fastify.botService.onBotConquest(attackerVillageId, defenderVillageId).catch((err: any) =>
              console.error('[AttackWorker] Erreur brain post-conquête :', err),
            );
          }
        }
      }

      // Job de retour des survivants (avec le pillage embarqué)
      if (Object.keys(survivors).length > 0) {
        const travelMs = job.data.travelMs ?? 15000;
        await (fastify as any).attackQueue.addJob({
          attackerVillageId, defenderVillageId,
          units:     survivors,
          activeAttackId,
          returning: true,
          travelMs,
          survivors,
          loot: result.attackerWon ? loot : { wood: 0, stone: 0, iron: 0 },
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
