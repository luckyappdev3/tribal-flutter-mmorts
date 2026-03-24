import { PrismaClient } from '@prisma/client';
import { BuildingQueue } from '../../engine/queue/queues/build.queue';
import { GameDataRegistry } from '../../engine/game-data-registry';
import { VillageService } from '../village/village.service';
import { calculateCostForLevel, calculateTimeForLevel } from '@mmorts/shared/formulas';

// ─────────────────────────────────────────────────────────────
//  ConstructionService — Phase 1 patch
//  Multi-slots via BuildingQueueItem.
//  Les imports et la signature du constructeur sont identiques
//  à l'original pour ne pas casser main.ts.
// ─────────────────────────────────────────────────────────────

const MAX_BUILD_SLOTS = 2; // Nombre max de bâtiments en file simultanément

export class ConstructionService {
  constructor(
    private prisma:         PrismaClient,
    private buildQueue:     BuildingQueue,
    private gameData:       GameDataRegistry,
    private villageService: VillageService,
  ) {}

  async startUpgrade(villageId: string, buildingId: string) {
    // Mettre à jour les ressources avant de vérifier les coûts
    await this.villageService.updateResources(villageId);

    // ── Vérifier les slots disponibles (via BuildingQueueItem) ──
    const activeItems = await this.prisma.buildingQueueItem.findMany({
      where:   { villageId },
      orderBy: { position: 'asc' },
    });

    if (activeItems.length >= MAX_BUILD_SLOTS) {
      throw new Error(`File de construction pleine (${MAX_BUILD_SLOTS} slots maximum).`);
    }

    // ── Vérifier si ce bâtiment est déjà en file ───────────────
    const alreadyQueued = activeItems.some(i => i.buildingId === buildingId);
    if (alreadyQueued) {
      throw new Error(`Ce bâtiment est déjà en file de construction.`);
    }

    // ── Niveau actuel + définition du bâtiment ──────────────────
    const buildingInstance = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId, buildingId } },
    });
    const currentLevel = buildingInstance?.level ?? 0;

    // ── Vérification des prérequis (seulement pour le niveau 1) ─
    if (currentLevel === 0) {
      const buildingDef = this.gameData.getBuildingDef(buildingId);
      const prereqs     = buildingDef.prerequisites ?? {};
      const prereqEntries = Object.entries(prereqs);
      if (prereqEntries.length > 0) {
        const instances = await this.prisma.buildingInstance.findMany({
          where: { villageId },
        });
        const levelMap = new Map(instances.map(b => [b.buildingId, b.level]));
        const missing = prereqEntries.filter(([bid, req]) => (levelMap.get(bid) ?? 0) < (req as number));
        if (missing.length > 0) {
          const details = missing
            .map(([bid, req]) => `${bid} niv.${req}`)
            .join(', ');
          throw new Error(`Prérequis non remplis : ${details}`);
        }
      }
    }
    const targetLevel  = currentLevel + 1;
    const buildingDef  = this.gameData.getBuildingDef(buildingId);
    const costs        = calculateCostForLevel(buildingDef, targetLevel);

    // ── Bonus de vitesse QG + gameSpeed du monde ────────────────
    const hqInstance = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId, buildingId: 'headquarters' } },
    });
    const hqLevel      = hqInstance?.level ?? 0;
    const hqSpeedBonus = 1 - hqLevel * 0.05; // Niv 10 = −50%

    const gameSpeed = await this._getGameSpeed(villageId);

    const baseDurationSec = calculateTimeForLevel(buildingDef, targetLevel);
    const durationMs      = Math.floor(
      baseDurationSec * Math.max(0.1, hqSpeedBonus) * 1000 / gameSpeed,
    );

    // ── startsAt : après le dernier item de la file ─────────────
    const lastItem = activeItems[activeItems.length - 1];
    const startsAt = lastItem ? new Date(lastItem.endsAt.getTime()) : new Date();
    const endsAt   = new Date(startsAt.getTime() + durationMs);
    const position = activeItems.length; // 0 = en cours, 1 = en attente

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
        data: {
          wood:  { decrement: costs.wood  },
          stone: { decrement: costs.stone },
          iron:  { decrement: costs.iron  },
        },
      });

      const queueItem = await tx.buildingQueueItem.create({
        data: { villageId, buildingId, targetLevel, position, startsAt, endsAt },
      });

      // Le job BullMQ est planifié à partir de maintenant + durationMs
      // (même si l'item est en attente : le worker vérifiera la position)
      if (position === 0) {
        await this.buildQueue.addJob({ villageId, buildingId, targetLevel }, durationMs);
      }

      return { ...queueItem, durationMs, hqLevel, hqSpeedBonus };
    });
  }

  /** Annuler un item en attente (position > 0 uniquement) */
  async cancelQueueItem(villageId: string, itemId: string) {
    const item = await this.prisma.buildingQueueItem.findUnique({ where: { id: itemId } });
    if (!item || item.villageId !== villageId) throw new Error('Item introuvable.');
    if (item.position === 0) throw new Error('Impossible d\'annuler un bâtiment en cours.');

    const def   = this.gameData.getBuildingDef(item.buildingId);
    const costs = calculateCostForLevel(def, item.targetLevel);

    await this.prisma.$transaction([
      this.prisma.buildingQueueItem.delete({ where: { id: itemId } }),
      // Remboursement 50%
      this.prisma.village.update({
        where: { id: villageId },
        data: {
          wood:  { increment: Math.floor(costs.wood  * 0.5) },
          stone: { increment: Math.floor(costs.stone * 0.5) },
          iron:  { increment: Math.floor(costs.iron  * 0.5) },
        },
      }),
      // Réindexer les positions suivantes
      this.prisma.$executeRaw`
        UPDATE "BuildingQueueItem"
        SET position = position - 1
        WHERE "villageId" = ${villageId}
          AND position > ${item.position}
      `,
    ]);

    return { cancelled: true, itemId };
  }

  /** Récupérer la file de construction d'un village */
  async getQueue(villageId: string) {
    return this.prisma.buildingQueueItem.findMany({
      where:   { villageId },
      orderBy: { position: 'asc' },
    });
  }

  private async _getGameSpeed(villageId: string): Promise<number> {
    const village = await this.prisma.village.findUnique({
      where:   { id: villageId },
      include: { world: { select: { gameSpeed: true } } },
    });
    return village?.world?.gameSpeed ?? 1.0;
  }
}
