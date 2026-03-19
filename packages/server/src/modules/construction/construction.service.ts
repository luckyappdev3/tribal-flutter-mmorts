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
    await this.villageService.updateResources(villageId);

    const existingJob = await this.prisma.buildingQueue.findUnique({ where: { villageId } });
    if (existingJob) throw new Error('Un bâtiment est déjà en cours de construction.');

    const buildingInstance = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId, buildingId } },
    });

    const currentLevel = buildingInstance?.level ?? 0;
    const targetLevel  = currentLevel + 1;
    const buildingDef  = this.gameData.getBuildingDef(buildingId);
    const costs        = calculateCostForLevel(buildingDef, targetLevel);

    // ── Bonus de vitesse du QG (−5% par niveau) ──
    const hqInstance = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId, buildingId: 'headquarters' } },
    });
    const hqLevel    = hqInstance?.level ?? 0;
    const hqSpeedBonus = 1 - hqLevel * 0.05; // Niv 1 = -5%, Niv 10 = -50%
    const baseDurationSec = calculateTimeForLevel(buildingDef, targetLevel);
    const durationMs = Math.floor(baseDurationSec * Math.max(0.1, hqSpeedBonus) * 1000);

    return await this.prisma.$transaction(async (tx) => {
      const village = await tx.village.findUnique({ where: { id: villageId } });

      if (
        !village ||
        village.wood  < costs.wood  ||
        village.stone < costs.stone ||
        village.iron  < costs.iron
      ) {
        throw new Error("Ressources insuffisantes pour lancer l'amélioration.");
      }

      await tx.village.update({
        where: { id: villageId },
        data: { wood: { decrement: costs.wood }, stone: { decrement: costs.stone }, iron: { decrement: costs.iron } },
      });

      const endsAt     = new Date(Date.now() + durationMs);
      const queueEntry = await tx.buildingQueue.create({
        data: { villageId, buildingId, targetLevel, endsAt },
      });

      await this.buildQueue.addJob({ villageId, buildingId, targetLevel }, durationMs);

      return { ...queueEntry, durationMs, hqLevel, hqSpeedBonus };
    });
  }
}
