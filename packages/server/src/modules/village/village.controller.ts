import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProductionFormulas } from '@mmorts/shared';

export async function villageRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  // GET /api/villages/:id
  // Retourne le village avec ses ressources à jour + les taux de production/s
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string };

    try {
      const village = await fastify.villageService.updateResources(id);

      if (village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé à ce village' });
      }

      // Calcul des taux de production par seconde pour l'interpolation côté Flutter
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

      // File de construction en cours (null si aucune)
      const buildQueue = await fastify.prisma.buildingQueue.findUnique({
        where: { villageId: id },
      });

      return { ...village, productionRates, buildQueue };
    } catch (error) {
      return reply.status(404).send({ message: 'Village non trouvé' });
    }
  });

  // GET /api/villages/:id/buildings
  // Retourne la liste des bâtiments avec leur niveau + la queue en cours
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

      return { buildings, queue };
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
      console.log("❌ [DEBUG UPGRADE] Error message:", error.message);
      return reply.status(400).send({ error: error.message });
    }
  });
}
