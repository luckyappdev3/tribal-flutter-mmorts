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

      const buildQueue = await fastify.prisma.buildingQueue.findUnique({
        where: { villageId: id },
      });

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
  // Retourne chaque bâtiment enrichi : coût, temps, et production actuelle → future
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

      const [buildings, queue] = await Promise.all([
        fastify.prisma.buildingInstance.findMany({ where: { villageId: id } }),
        fastify.prisma.buildingQueue.findUnique({ where: { villageId: id } }),
      ]);

      const enrichedBuildings = buildings.map(b => {
        const nextLevel = b.level + 1;
        let nextLevelCost: { wood: number; stone: number; iron: number } | null = null;
        let nextLevelTimeSec: number | null = null;

        // Production actuelle et future (uniquement pour les bâtiments producteurs)
        let currentProdPerSec: number | null = null;
        let nextProdPerSec: number | null = null;

        try {
          const def = fastify.gameData.getBuildingDef(b.buildingId);

          if (nextLevel <= def.maxLevel) {
            const cost       = calculateCostForLevel(def, nextLevel);
            nextLevelCost    = { wood: cost.wood, stone: cost.stone, iron: cost.iron };
            nextLevelTimeSec = calculateTimeForLevel(def, nextLevel);
          }

          if (PRODUCTION_BUILDINGS.includes(b.buildingId)) {
            currentProdPerSec = ProductionFormulas.getHourlyRate(b.level) / 3600;
            nextProdPerSec    = nextLevel <= def.maxLevel
              ? ProductionFormulas.getHourlyRate(nextLevel) / 3600
              : null;
          }
        } catch (_) {
          // Bâtiment non trouvé dans le registre → null
        }

        return {
          buildingId:       b.buildingId,
          level:            b.level,
          nextLevelCost,
          nextLevelTimeSec,
          currentProdPerSec,
          nextProdPerSec,
        };
      });

      return { buildings: enrichedBuildings, queue };
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
