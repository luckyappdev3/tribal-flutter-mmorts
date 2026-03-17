import { PrismaClient } from '@prisma/client';
import { BuildingQueue } from '../../engine/queue/queues/build.queue';
import { GameDataRegistry } from '../../engine/game-data-registry';
import { VillageService } from '../village/village.service';
import { calculateCostForLevel, calculateTimeForLevel } from '@mmorts/shared/formulas';

export class ConstructionService {
  constructor(
    private prisma: PrismaClient,
    private buildQueue: BuildingQueue,
    private gameData: GameDataRegistry,
    private villageService: VillageService
  ) {}

  async startUpgrade(villageId: string, buildingId: string) {
    // 1. Sync des ressources (lazy eval)
    await this.villageService.updateResources(villageId);

    // 2. Une seule construction à la fois
    const existingJob = await this.prisma.buildingQueue.findUnique({
      where: { villageId },
    });
    if (existingJob) {
      throw new Error('Un bâtiment est déjà en cours de construction.');
    }

    // 3. Niveau actuel → niveau cible
    const buildingInstance = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId, buildingId } },
    });

    const currentLevel = buildingInstance?.level ?? 0;
    const targetLevel  = currentLevel + 1;
    const buildingDef  = this.gameData.getBuildingDef(buildingId);

    // 4. Coûts et durée
    const costs      = calculateCostForLevel(buildingDef, targetLevel);
    const durationMs = calculateTimeForLevel(buildingDef, targetLevel) * 1000;

    // 5. Transaction atomique : vérification, déduction, création en queue
    return await this.prisma.$transaction(async (tx) => {
      const village = await tx.village.findUnique({ where: { id: villageId } });

      if (
        !village ||
        village.wood  < costs.wood  ||
        village.stone < costs.stone || // ← était costs.clay
        village.iron  < costs.iron
      ) {
        throw new Error('Ressources insuffisantes pour lancer l\'amélioration.');
      }

      await tx.village.update({
        where: { id: villageId },
        data: {
          wood:  { decrement: costs.wood  },
          stone: { decrement: costs.stone }, // ← était costs.clay
          iron:  { decrement: costs.iron  },
        },
      });

      const endsAt = new Date(Date.now() + durationMs);
      const queueEntry = await tx.buildingQueue.create({
        data: { villageId, buildingId, targetLevel, endsAt },
      });

      await this.buildQueue.addJob({ villageId, buildingId, targetLevel }, durationMs);

      return queueEntry;
    });
  }
}
