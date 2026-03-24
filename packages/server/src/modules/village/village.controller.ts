import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  ProductionFormulas,
  calculateCostForLevel,
  calculateTimeForLevel,
  calcMaxStorage,
} from '@mmorts/shared';

const PRODUCTION_BUILDINGS = ['timber_camp', 'quarry', 'iron_mine'];

async function getGameSpeed(fastify: FastifyInstance, villageId: string): Promise<number> {
  const v = await fastify.prisma.village.findUnique({
    where:   { id: villageId },
    include: { world: { select: { gameSpeed: true } } },
  });
  return (v as any)?.world?.gameSpeed ?? 1.0;
}

export async function villageRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string };

    try {
      const village = await fastify.villageService.updateResources(id);

      if (village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé à ce village' });
      }

      const [buildings, gameSpeed] = await Promise.all([
        fastify.prisma.buildingInstance.findMany({ where: { villageId: id } }),
        getGameSpeed(fastify, id),
      ]);

      const getLevel = (bid: string) =>
        buildings.find(b => b.buildingId === bid)?.level || 0;

      const productionRates = {
        wood:  ProductionFormulas.getHourlyRate(getLevel('timber_camp')) / 3600 * gameSpeed,
        stone: ProductionFormulas.getHourlyRate(getLevel('quarry'))      / 3600 * gameSpeed,
        iron:  ProductionFormulas.getHourlyRate(getLevel('iron_mine'))   / 3600 * gameSpeed,
      };

      const buildQueueItem = await fastify.prisma.buildingQueueItem.findFirst({
        where:   { villageId: id, position: 0 },
        orderBy: { startsAt: 'asc' },
      });

      const buildQueue = buildQueueItem
        ? {
            buildingId:  buildQueueItem.buildingId,
            targetLevel: buildQueueItem.targetLevel,
            endsAt:      buildQueueItem.endsAt.toISOString(),
          }
        : null;

      return {
        ...village,
        productionRates,
        buildQueue,
        maxStorage: calcMaxStorage(getLevel('warehouse')),
      };
    } catch (error) {
      return reply.status(404).send({ message: 'Village non trouvé' });
    }
  });

  fastify.get('/:id/buildings', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string };

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id },
        select: { playerId: true },
      });

      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé' });
      }

      const [instances, queueItems, gameSpeed] = await Promise.all([
        fastify.prisma.buildingInstance.findMany({ where: { villageId: id } }),
        fastify.prisma.buildingQueueItem.findMany({
          where:   { villageId: id },
          orderBy: { position: 'asc' },
        }),
        getGameSpeed(fastify, id),
      ]);

      const activeItem = queueItems.find(i => i.position === 0) ?? null;
      const queue = activeItem
        ? {
            buildingId:  activeItem.buildingId,
            targetLevel: activeItem.targetLevel,
            endsAt:      activeItem.endsAt.toISOString(),
          }
        : null;

      const instanceMap = new Map(instances.map(b => [b.buildingId, b.level]));
      const allBuildings = fastify.gameData.getAllBuildings();

      const enrichedBuildings = allBuildings.map(def => {
        const currentLevel = instanceMap.get(def.id) ?? 0;
        const nextLevel    = currentLevel + 1;

        let nextLevelCost: { wood: number; stone: number; iron: number } | null = null;
        let nextLevelTimeSec: number | null = null;
        let currentProdPerSec: number | null = null;
        let nextProdPerSec: number | null = null;

        if (nextLevel <= def.maxLevel) {
          const cost    = calculateCostForLevel(def, nextLevel);
          nextLevelCost = { wood: cost.wood, stone: cost.stone, iron: cost.iron };

          const baseSec    = calculateTimeForLevel(def, nextLevel);
          const hqLevel    = instanceMap.get('headquarters') ?? 0;
          const hqBonus    = Math.max(0.1, 1 - hqLevel * 0.05);
          nextLevelTimeSec = Math.max(1, Math.floor(baseSec * hqBonus / gameSpeed));
        }

        if (PRODUCTION_BUILDINGS.includes(def.id)) {
          currentProdPerSec = ProductionFormulas.getHourlyRate(currentLevel) / 3600 * gameSpeed;
          nextProdPerSec    = nextLevel <= def.maxLevel
            ? ProductionFormulas.getHourlyRate(nextLevel) / 3600 * gameSpeed
            : null;
        }

        // ── Prérequis manquants ─────────────────────────────────
        const prereqs = def.prerequisites ?? {};
        const missingPrerequisites = Object.entries(prereqs)
          .filter(([bid, req]) => (instanceMap.get(bid) ?? 0) < (req as number))
          .map(([bid, req]) => ({
            buildingId: bid,
            required:   req as number,
            current:    instanceMap.get(bid) ?? 0,
          }));
        const isLocked = currentLevel === 0 && missingPrerequisites.length > 0;

        return {
          buildingId:           def.id,
          level:                currentLevel,
          nextLevelCost,
          nextLevelTimeSec,
          currentProdPerSec,
          nextProdPerSec,
          isLocked,
          missingPrerequisites,
        };
      });

      return {
        buildings:  enrichedBuildings,
        queue,
        queueCount: queueItems.length,
        queueItems: queueItems.map(i => ({
          buildingId:  i.buildingId,
          targetLevel: i.targetLevel,
          position:    i.position,
          endsAt:      i.endsAt.toISOString(),
        })),
      };
    } catch (error) {
      return reply.status(404).send({ message: 'Village non trouvé' });
    }
  });

  fastify.post('/:id/upgrade', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { buildingId } = request.body as { buildingId: string };
    const player = request.user as { id: string };

    if (!buildingId) {
      return reply.status(400).send({ message: 'buildingId est requis' });
    }

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id },
        select: { playerId: true },
      });

      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: "Ce village ne vous appartient pas" });
      }

      const result = await fastify.constructionService.startUpgrade(id, buildingId);
      return result;
    } catch (error: any) {
      console.log('❌ [UPGRADE ERROR]', error.message);
      return reply.status(400).send({ error: error.message });
    }
  });
}