import { PrismaClient } from '@prisma/client';
import { BuildingQueue } from '../../engine/queue/queues/build.queue';
import { GameDataRegistry } from '../../engine/game-data-registry';
import { VillageService } from '../village/village.service';
// On importe les fonctions avec leurs nouveaux noms
import { calculateCostForLevel, calculateTimeForLevel } from '@mmorts/shared/formulas';

export class ConstructionService {
  constructor(
    private prisma: PrismaClient,
    private buildQueue: BuildingQueue,
    private gameData: GameDataRegistry,
    private villageService: VillageService
  ) {}

  async startUpgrade(villageId: string, buildingId: string) {
    // 1. Synchronisation des ressources (production passive)
    await this.villageService.updateResources(villageId);

    // 2. Vérification si une construction est déjà en cours
    const existingJob = await this.prisma.buildingQueue.findUnique({
      where: { villageId }
    });
    if (existingJob) {
      throw new Error("Un bâtiment est déjà en cours de construction.");
    }

    // 3. Détermination du niveau cible
    const buildingInstance = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId, buildingId } }
    });
    
    const currentLevel = buildingInstance?.level ?? 0;
    const targetLevel = currentLevel + 1;
    const buildingDef = this.gameData.getBuildingDef(buildingId);

    // 4. Calcul des coûts et du temps (Conversion en ms pour BullMQ)
    const costs = calculateCostForLevel(buildingDef, targetLevel);
    const durationMs = calculateTimeForLevel(buildingDef, targetLevel) * 1000;

    // 5. Transaction atomique pour la déduction et la mise en file d'attente
    return await this.prisma.$transaction(async (tx) => {
      const village = await tx.village.findUnique({ where: { id: villageId } });
      
      if (!village || 
          village.wood < costs.wood || 
          village.stone < costs.stone || 
          village.iron < costs.iron) {
        throw new Error("Ressources insuffisantes pour lancer l'amélioration.");
      }

      // Déduction des ressources
      await tx.village.update({
        where: { id: villageId },
        data: {
          wood: { decrement: costs.wood },
          stone: { decrement: costs.stone },
          iron: { decrement: costs.iron },
        }
      });

      // Création de l'entrée en base de données
      const endsAt = new Date(Date.now() + durationMs);
      const queueEntry = await tx.buildingQueue.create({
        data: {
          villageId,
          buildingId,
          targetLevel,
          endsAt
        }
      });

      // 6. Envoi à BullMQ (Redis) pour le déclenchement du Worker à la fin du chrono
      await this.buildQueue.addJob({
        villageId,
        buildingId,
        targetLevel
      }, durationMs);

      return queueEntry;
    });
  }
}