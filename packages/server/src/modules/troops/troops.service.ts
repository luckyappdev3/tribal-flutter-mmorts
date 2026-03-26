import { PrismaClient } from '@prisma/client';
import { GameDataRegistry } from '../../engine/game-data-registry';
import { RecruitQueue } from '../../engine/queue/queues/recruit.queue';
import { calcMaxPopulation, calcTotalPopUsed } from '@mmorts/shared';

export class TroopsService {
  constructor(
    private prisma:    PrismaClient,
    private gameData:  GameDataRegistry,
    private recruitQ:  RecruitQueue,
  ) {}

  // ── Mapping catégorie → bâtiment de recrutement ──────────────
  private getBuildingTypeForUnit(category: string): string {
    switch (category) {
      case 'cavalry':   return 'stable';
      case 'siege':     return 'garage';
      case 'hero':      return 'statue';
      case 'conquest':  return 'snob';
      default:          return 'barracks'; // infantry, archer
    }
  }

  // ── Formule : T_reel = T_base × 0.94^(niveau−1) / gameSpeed ──
  private calcRecruitTimeMs(baseTimeSec: number, buildingLevel: number, gameSpeed: number): number {
    const T_real = baseTimeSec * Math.pow(0.94, Math.max(0, buildingLevel - 1));
    return Math.max(1000, Math.floor(T_real * 1000 / gameSpeed));
  }

  // ── Calcule la population utilisée ──────────────────────────
  private calcUsedPopulation(troops: { unitType: string; count: number }[]): number {
    let used = 0;
    for (const t of troops) {
      try {
        const def = this.gameData.getUnitDef(t.unitType);
        used += t.count * (def.populationCost ?? 1);
      } catch { continue; }
    }
    return used;
  }

  // ── Troupes en déplacement (attaques actives) ─────────────
  private calcActiveAttackPop(attacks: { units: any; survivors: any; status: string }[]): number {
    let used = 0;
    for (const attack of attacks) {
      const rawUnits = attack.status === 'returning' && attack.survivors
        ? attack.survivors
        : attack.units;
      if (!rawUnits || typeof rawUnits !== 'object') continue;
      for (const [unitType, count] of Object.entries(rawUnits as Record<string, number>)) {
        if (!count) continue;
        try {
          const def = this.gameData.getUnitDef(unitType);
          used += count * (def.populationCost ?? 1);
        } catch { continue; }
      }
    }
    return used;
  }

  // ── Troupes en renfort (supports envoyés) ─────────────────
  private calcActiveSupportPop(supports: { units: any }[]): number {
    let used = 0;
    for (const s of supports) {
      if (!s.units || typeof s.units !== 'object') continue;
      for (const [unitType, count] of Object.entries(s.units as Record<string, number>)) {
        if (!count) continue;
        try {
          const def = this.gameData.getUnitDef(unitType);
          used += count * (def.populationCost ?? 1);
        } catch { continue; }
      }
    }
    return used;
  }

  // ── Troupes en cours de recrutement (file) ────────────────
  private calcRecruitQueuePop(queues: { unitType: string; totalCount: number; trainedCount: number }[]): number {
    let used = 0;
    for (const q of queues) {
      const pending = q.totalCount - q.trainedCount;
      if (pending <= 0) continue;
      try {
        const def = this.gameData.getUnitDef(q.unitType);
        used += pending * (def.populationCost ?? 1);
      } catch { continue; }
    }
    return used;
  }

  // ── Liste des troupes + files actives ────────────────────────
  async getTroops(villageId: string) {
    const [troops, queues, buildings, village, activeAttacks, activeSupports] = await Promise.all([
      this.prisma.troop.findMany({ where: { villageId } }),
      this.prisma.recruitQueue.findMany({
        where:   { villageId },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.buildingInstance.findMany({ where: { villageId } }),
      this.prisma.village.findUnique({
        where: { id: villageId }, include: { world: { select: { gameSpeed: true } } },
      }),
      this.prisma.activeAttack.findMany({
        where: { attackerVillageId: villageId, status: { in: ['traveling', 'returning'] } },
        select: { units: true, survivors: true, status: true },
      }),
      (this.prisma as any).activeSupport.findMany({
        where:  { fromVillageId: villageId },
        select: { units: true },
      }),
    ]);

    const allUnits = this.gameData.getAllUnits();
    const troopMap = Object.fromEntries(troops.map(t => [t.unitType, t.count]));
    const buildMap = Object.fromEntries(buildings.map(b => [b.buildingId, b.level]));
    const gameSpeed = (village as any)?.world?.gameSpeed ?? 1.0;

    const farmLevel       = buildMap['farm'] ?? 1;
    const maxPop          = calcMaxPopulation(farmLevel);
    const buildingPopUsed = calcTotalPopUsed(
      buildings.map(b => ({ buildingId: b.buildingId, level: b.level })),
    );
    const usedPop = this.calcUsedPopulation(troops) + buildingPopUsed
      + this.calcActiveAttackPop(activeAttacks)
      + this.calcActiveSupportPop(activeSupports)
      + this.calcRecruitQueuePop(queues);

    return {
      troops: allUnits.map(u => {
        let prerequisiteMet = true;
        let prerequisiteMsg: string | null = null;
        const missing = (u.requiredBuildings ?? []).filter(
          req => (buildMap[req.buildingId] ?? 0) < req.level,
        );
        if (missing.length > 0) {
          prerequisiteMet = false;
          prerequisiteMsg = 'Requiert : ' + missing.map(req => {
            try {
              const bDef = this.gameData.getBuildingDef(req.buildingId);
              return `${bDef.name} niv.${req.level}`;
            } catch {
              return `${req.buildingId} niv.${req.level}`;
            }
          }).join(', ');
        }

        // Temps de recrutement + vitesse effectifs (gamespeed + bâtiment)
        const buildingType         = this.getBuildingTypeForUnit(u.category);
        const buildingLevel        = buildMap[buildingType] ?? 1;
        const effectiveRecruitTime = Math.max(
          1,
          Math.round(u.recruitTime * Math.pow(0.94, Math.max(0, buildingLevel - 1)) / gameSpeed),
        );
        // Vitesse effective : secondes pour traverser 1 case (gamespeed appliqué)
        const effectiveSpeed = Math.round((u.speed / gameSpeed) * 100) / 100;

        return {
          unitType:             u.id,
          name:                 u.name,
          count:                troopMap[u.id] ?? 0,
          attack:               u.attack,
          defenseGeneral:       u.defenseGeneral,
          defenseCavalry:       u.defenseCavalry,
          defenseArcher:        u.defenseArcher,
          speed:                u.speed,            // base (référence combat)
          effectiveSpeed,                           // s/case affiché
          carryCapacity:        u.carryCapacity,
          cost:                 u.cost,
          recruitTime:          u.recruitTime,
          effectiveRecruitTime,
          populationCost:       u.populationCost ?? 1,
          prerequisiteMet,
          prerequisiteMsg,
        };
      }),
      queues,
      population: { used: usedPop, max: maxPop, farmLevel },
    };
  }

  // ── Lancer un recrutement ────────────────────────────────────
  async startRecruit(villageId: string, unitType: string, count: number) {
    if (count <= 0) throw new Error('La quantité doit être supérieure à 0.');

    // 1. Définition + bâtiment responsable
    const unitDef      = this.gameData.getUnitDef(unitType);
    const buildingType = this.getBuildingTypeForUnit(unitDef.category);

    // 2. Vérifier que le bâtiment de recrutement existe (niveau ≥ 1)
    const building = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId, buildingId: buildingType } },
    });
    if (!building || building.level < 1) {
      let bName = buildingType;
      try { bName = this.gameData.getBuildingDef(buildingType).name; } catch { /* ok */ }
      throw new Error(`Vous devez construire ${bName} (niv.1) pour recruter cette unité.`);
    }

    // 3. Prérequis de bâtiments de l'unité
    if (unitDef.requiredBuildings && unitDef.requiredBuildings.length > 0) {
      const buildingInstances = await this.prisma.buildingInstance.findMany({ where: { villageId } });
      const buildMap = Object.fromEntries(buildingInstances.map(b => [b.buildingId, b.level]));
      for (const req of unitDef.requiredBuildings) {
        if ((buildMap[req.buildingId] ?? 0) < req.level) {
          let bName = req.buildingId;
          try { bName = this.gameData.getBuildingDef(req.buildingId).name; } catch { /* ok */ }
          throw new Error(`Requiert ${bName} niveau ${req.level} pour recruter des ${unitDef.name}.`);
        }
      }
    }

    // 4. Vérifier le cap de population (Ferme)
    const [troops, buildings, activeAttacks, existingQueues] = await Promise.all([
      this.prisma.troop.findMany({ where: { villageId } }),
      this.prisma.buildingInstance.findMany({ where: { villageId } }),
      this.prisma.activeAttack.findMany({
        where: { attackerVillageId: villageId, status: { in: ['traveling', 'returning'] } },
        select: { units: true, survivors: true, status: true },
      }),
      this.prisma.recruitQueue.findMany({ where: { villageId } }),
    ]);
    const buildMap        = Object.fromEntries(buildings.map(b => [b.buildingId, b.level]));
    const farmLevel       = buildMap['farm'] ?? 1;
    const maxPop          = calcMaxPopulation(farmLevel);
    const buildingPopUsed = calcTotalPopUsed(
      buildings.map(b => ({ buildingId: b.buildingId, level: b.level })),
    );
    const usedPop = this.calcUsedPopulation(troops) + buildingPopUsed
      + this.calcActiveAttackPop(activeAttacks)
      + this.calcRecruitQueuePop(existingQueues);
    const newPop  = count * (unitDef.populationCost ?? 1);

    if (usedPop + newPop > maxPop) {
      const available = Math.max(0, Math.floor((maxPop - usedPop) / (unitDef.populationCost ?? 1)));
      throw new Error(
        `Population insuffisante. Ferme niv.${farmLevel} = ${maxPop} pop. ` +
        `Utilisée : ${usedPop}. Disponible : ${available} ${unitDef.name}(s) max.`
      );
    }

    // 5. Coût total
    const totalCost = {
      wood:  unitDef.cost.wood  * count,
      stone: unitDef.cost.stone * count,
      iron:  unitDef.cost.iron  * count,
    };

    // 6. GameSpeed du monde
    const village   = await this.prisma.village.findUnique({
      where: { id: villageId }, include: { world: { select: { gameSpeed: true } } },
    });
    const gameSpeed = (village as any)?.world?.gameSpeed ?? 1.0;

    // 7. Durée de la première unité
    const firstUnitMs = this.calcRecruitTimeMs(unitDef.recruitTime, building.level, gameSpeed);

    // 8. Y a-t-il déjà une chaîne active pour ce bâtiment ?
    const existingEntries = await this.prisma.recruitQueue.findMany({
      where: { villageId, buildingType },
    });
    const hasActiveChain = existingEntries.length > 0;

    // 9. Transaction : déduction ressources + création entrée
    const entry = await this.prisma.$transaction(async (tx) => {
      const v = await tx.village.findUnique({ where: { id: villageId } });
      if (!v || v.wood < totalCost.wood || v.stone < totalCost.stone || v.iron < totalCost.iron) {
        throw new Error('Ressources insuffisantes pour ce recrutement.');
      }

      await tx.village.update({
        where: { id: villageId },
        data: {
          wood:  { decrement: totalCost.wood  },
          stone: { decrement: totalCost.stone },
          iron:  { decrement: totalCost.iron  },
        },
      });

      const nextUnitAt = new Date(Date.now() + firstUnitMs);
      return await tx.recruitQueue.create({
        data: { villageId, buildingType, unitType, totalCount: count, trainedCount: 0, nextUnitAt },
      });
    });

    // 10. Lancer le premier job BullMQ si aucune chaîne active
    if (!hasActiveChain) {
      await this.recruitQ.addJob(
        { villageId, unitType, count, queueId: entry.id, buildingType },
        firstUnitMs,
      );
    }

    return { ...entry, firstUnitMs, totalCost, unitName: unitDef.name };
  }

  // ── Annuler une entrée de file + remboursement ───────────────
  async cancelRecruit(villageId: string, queueId: string) {
    const entry = await this.prisma.recruitQueue.findUnique({ where: { id: queueId } });
    if (!entry || entry.villageId !== villageId) {
      throw new Error('Entrée de file introuvable.');
    }

    const unitDef   = this.gameData.getUnitDef(entry.unitType);
    const remaining = entry.totalCount - entry.trainedCount;
    const refund    = {
      wood:  unitDef.cost.wood  * remaining,
      stone: unitDef.cost.stone * remaining,
      iron:  unitDef.cost.iron  * remaining,
    };

    // Est-ce l'entrée active (la plus ancienne pour ce bâtiment) ?
    const olderCount = await this.prisma.recruitQueue.count({
      where: { villageId, buildingType: entry.buildingType, startsAt: { lt: entry.startsAt } },
    });
    const isActive = olderCount === 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.village.update({
        where: { id: villageId },
        data:  { wood: { increment: refund.wood }, stone: { increment: refund.stone }, iron: { increment: refund.iron } },
      });
      await tx.recruitQueue.delete({ where: { id: queueId } });
    });

    // Si c'était l'entrée active, lancer le prochain lot
    if (isActive) {
      const nextEntry = await this.prisma.recruitQueue.findFirst({
        where:   { villageId, buildingType: entry.buildingType },
        orderBy: { startsAt: 'asc' },
      });
      if (nextEntry) {
        const [building, village] = await Promise.all([
          this.prisma.buildingInstance.findUnique({
            where: { villageId_buildingId: { villageId, buildingId: entry.buildingType } },
          }),
          this.prisma.village.findUnique({
            where: { id: villageId }, include: { world: { select: { gameSpeed: true } } },
          }),
        ]);
        const gameSpeed = (village as any)?.world?.gameSpeed ?? 1.0;
        const nextDef   = this.gameData.getUnitDef(nextEntry.unitType);
        const nextMs    = this.calcRecruitTimeMs(nextDef.recruitTime, building?.level ?? 1, gameSpeed);
        await this.prisma.recruitQueue.update({
          where: { id: nextEntry.id },
          data:  { nextUnitAt: new Date(Date.now() + nextMs) },
        });
        await this.recruitQ.addJob(
          { villageId, unitType: nextEntry.unitType, count: nextEntry.totalCount, queueId: nextEntry.id, buildingType: entry.buildingType },
          nextMs,
        );
      }
    }

    return { refund, cancelledUnitType: entry.unitType, remainingRefunded: remaining };
  }
}
