import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  ProductionFormulas,
  calculateCostForLevel,
  calculateTimeForLevel,
  calcMaxStorage,
} from '@mmorts/shared';

// Bâtiments qui produisent des ressources
const PRODUCTION_BUILDINGS = ['timber_camp', 'quarry', 'iron_mine'];

export async function villageRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  // GET /api/villages/:id
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string };

    try {
      const village = await fastify.villageService.updateResources(id);

      if (village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé à ce village' });
      }

      const buildings = await fastify.prisma.buildingInstance.findMany({
        where: { villageId: id },
      });
      const getLevel = (bid: string) =>
        buildings.find(b => b.buildingId === bid)?.level || 0;

      const productionRates = {
        wood:  ProductionFormulas.getHourlyRate(getLevel('timber_camp')) / 3600,
        stone: ProductionFormulas.getHourlyRate(getLevel('quarry'))      / 3600,
        iron:  ProductionFormulas.getHourlyRate(getLevel('iron_mine'))   / 3600,
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

      const warehouseLevel = getLevel('warehouse');

      return {
        ...village,
        productionRates,
        buildQueue,
        maxStorage: calcMaxStorage(warehouseLevel),
      };
    } catch (error) {
      return reply.status(404).send({ message: 'Village non trouvé' });
    }
  });

  // GET /api/villages/:id/buildings
  // ─────────────────────────────────────────────────────────────
  // Retourne TOUS les bâtiments du registre de jeu.
  // Pour ceux sans instance en BDD → niveau 0 (non construit).
  // ─────────────────────────────────────────────────────────────
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

      const [instances, queueItems] = await Promise.all([
        fastify.prisma.buildingInstance.findMany({ where: { villageId: id } }),
        fastify.prisma.buildingQueueItem.findMany({
          where:   { villageId: id },
          orderBy: { position: 'asc' },
        }),
      ]);

      // Adapter au format attendu par le client Flutter (BuildQueueDto)
      // On expose le premier item (position 0 = en cours) comme "queue"
      const activeItem = queueItems.find(i => i.position === 0) ?? null;
      const queue = activeItem
        ? {
            buildingId:  activeItem.buildingId,
            targetLevel: activeItem.targetLevel,
            endsAt:      activeItem.endsAt.toISOString(),
          }
        : null;

      // Map des instances existantes pour accès rapide
      const instanceMap = new Map(instances.map(b => [b.buildingId, b.level]));

      // Parcourir TOUS les bâtiments du registre (y compris farm, wall, etc.)
      const allBuildings = fastify.gameData.getAllBuildings();

      const enrichedBuildings = allBuildings.map(def => {
        const currentLevel = instanceMap.get(def.id) ?? 0;
        const nextLevel    = currentLevel + 1;

        let nextLevelCost: { wood: number; stone: number; iron: number } | null = null;
        let nextLevelTimeSec: number | null = null;
        let currentProdPerSec: number | null = null;
        let nextProdPerSec: number | null = null;

        if (nextLevel <= def.maxLevel) {
          const cost       = calculateCostForLevel(def, nextLevel);
          nextLevelCost    = { wood: cost.wood, stone: cost.stone, iron: cost.iron };
          nextLevelTimeSec = calculateTimeForLevel(def, nextLevel);
        }

        if (PRODUCTION_BUILDINGS.includes(def.id)) {
          currentProdPerSec = ProductionFormulas.getHourlyRate(currentLevel) / 3600;
          nextProdPerSec    = nextLevel <= def.maxLevel
            ? ProductionFormulas.getHourlyRate(nextLevel) / 3600
            : null;
        }

        return {
          buildingId:       def.id,
          level:            currentLevel,
          nextLevelCost,
          nextLevelTimeSec,
          currentProdPerSec,
          nextProdPerSec,
        };
      });

      return {
        buildings:  enrichedBuildings,
        queue,                          // 1er item (compat existante)
        queueCount: queueItems.length,
        queueItems: queueItems.map(i => ({ // ← NOUVEAU : toute la file
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

  // POST /api/villages/:id/upgrade
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
