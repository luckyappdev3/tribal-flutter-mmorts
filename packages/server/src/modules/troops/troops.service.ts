import { PrismaClient } from '@prisma/client';
import { GameDataRegistry } from '../../engine/game-data-registry';
import { RecruitQueue } from '../../engine/queue/queues/recruit.queue';
import { calcMaxPopulation } from '@mmorts/shared';

export class TroopsService {
  constructor(
    private prisma:    PrismaClient,
    private gameData:  GameDataRegistry,
    private recruitQ:  RecruitQueue,
  ) {}

  // ── Calcule la population utilisée (troupes présentes) ──
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

  // ── Liste des troupes disponibles dans un village ──
  async getTroops(villageId: string) {
    const [troops, queue, buildings] = await Promise.all([
      this.prisma.troop.findMany({ where: { villageId } }),
      this.prisma.recruitQueue.findUnique({ where: { villageId } }),
      this.prisma.buildingInstance.findMany({ where: { villageId } }),
    ]);

    const allUnits = this.gameData.getAllUnits();
    const troopMap = Object.fromEntries(troops.map(t => [t.unitType, t.count]));
    const buildMap = Object.fromEntries(buildings.map(b => [b.buildingId, b.level]));

    // Population
    const farmLevel    = buildMap['farm']    ?? 1;
    const stableLevel  = buildMap['stable']  ?? 0;
    const maxPop       = calcMaxPopulation(farmLevel);
    const usedPop      = this.calcUsedPopulation(troops);

    return {
      troops: allUnits.map(u => {
        // Prérequis bâtiment (ex: stable pour cavalry)
        let prerequisiteMet = true;
        let prerequisiteMsg: string | null = null;
        if (u.requiredBuilding) {
          const requiredLevel = buildMap[u.requiredBuilding] ?? 0;
          prerequisiteMet = requiredLevel >= 1;
          if (!prerequisiteMet) {
            const bDef = this.gameData.getBuildingDef(u.requiredBuilding);
            prerequisiteMsg = `Requiert : ${bDef.name} niveau 1`;
          }
        }

        return {
          unitType:        u.id,
          name:            u.name,
          count:           troopMap[u.id] ?? 0,
          attack:          u.attack,
          defense:         u.defense,
          speed:           u.speed,
          carryCapacity:   u.carryCapacity,
          cost:            u.cost,
          recruitTime:     u.recruitTime,
          populationCost:  u.populationCost ?? 1,
          prerequisiteMet,
          prerequisiteMsg,
        };
      }),
      queue,
      // ── NOUVEAU : infos de population ──
      population: {
        used:    usedPop,
        max:     maxPop,
        farmLevel,
      },
    };
  }

  // ── Lancer un recrutement ──
  async startRecruit(villageId: string, unitType: string, count: number) {
    if (count <= 0) throw new Error('La quantité doit être supérieure à 0.');

    // 1. Vérifier la caserne
    const barracks = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId, buildingId: 'barracks' } },
    });
    if (!barracks || barracks.level < 1) {
      throw new Error('Vous devez construire une Caserne pour recruter des troupes.');
    }

    // 2. Récupérer la définition de l'unité
    const unitDef = this.gameData.getUnitDef(unitType);

    // 3. ── NOUVEAU : vérifier le prérequis de bâtiment ──
    if (unitDef.requiredBuilding) {
      const reqBuilding = await this.prisma.buildingInstance.findUnique({
        where: { villageId_buildingId: { villageId, buildingId: unitDef.requiredBuilding } },
      });
      if (!reqBuilding || reqBuilding.level < 1) {
        const bDef = this.gameData.getBuildingDef(unitDef.requiredBuilding);
        throw new Error(`Vous devez construire ${bDef.name} pour recruter des ${unitDef.name}.`);
      }
    }

    // 4. ── NOUVEAU : vérifier le cap de population (Ferme) ──
    const [troops, buildings] = await Promise.all([
      this.prisma.troop.findMany({ where: { villageId } }),
      this.prisma.buildingInstance.findMany({ where: { villageId } }),
    ]);
    const buildMap   = Object.fromEntries(buildings.map(b => [b.buildingId, b.level]));
    const farmLevel  = buildMap['farm'] ?? 1;
    const maxPop     = calcMaxPopulation(farmLevel);
    const usedPop    = this.calcUsedPopulation(troops);
    const newPop     = count * (unitDef.populationCost ?? 1);

    if (usedPop + newPop > maxPop) {
      const available = Math.max(0, Math.floor((maxPop - usedPop) / (unitDef.populationCost ?? 1)));
      throw new Error(
        `Population insuffisante. Ferme niv.${farmLevel} = ${maxPop} pop. ` +
        `Utilisée : ${usedPop}. Disponible : ${available} ${unitDef.name}(s) max.`
      );
    }

    // 5. Vérifier qu'aucun recrutement n'est en cours
    const existing = await this.prisma.recruitQueue.findUnique({ where: { villageId } });
    if (existing) throw new Error('Un recrutement est déjà en cours.');

    // 6. Calcul du coût total
    const totalCost = {
      wood:  unitDef.cost.wood  * count,
      stone: unitDef.cost.stone * count,
      iron:  unitDef.cost.iron  * count,
    };

    // 7. Bonus de vitesse de la caserne (−5% par niveau)
    const barracksDef = this.gameData.getBuildingDef('barracks');
    const speedBonus  = 1 - (barracks.level * (barracksDef.baseStats.specialMultiplier ?? 0.05));

    // 8. Appliquer gameSpeed du monde
    const village    = await this.prisma.village.findUnique({
      where: { id: villageId }, include: { world: { select: { gameSpeed: true } } },
    });
    const gameSpeed  = (village as any)?.world?.gameSpeed ?? 1.0;
    const durationMs = Math.floor(unitDef.recruitTime * count * 1000 * speedBonus / gameSpeed);

    // 9. Transaction : ressources → queue → BullMQ
    return await this.prisma.$transaction(async (tx) => {
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

      const endsAt = new Date(Date.now() + durationMs);
      const entry  = await tx.recruitQueue.create({
        data: { villageId, unitType, count, endsAt },
      });

      await this.recruitQ.addJob({ villageId, unitType, count }, durationMs);

      return { ...entry, durationMs, totalCost, unitName: unitDef.name };
    });
  }
}
