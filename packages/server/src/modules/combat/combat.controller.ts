import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function combatRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  // POST /api/villages/:id/attack
  // Lance une attaque depuis le village :id vers defenderVillageId
  fastify.post('/:id/attack', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id }                               = request.params as { id: string };
    const { defenderVillageId, units }         = request.body as {
      defenderVillageId: string;
      units: Record<string, number>;
    };
    const player = request.user as { id: string };

    if (!defenderVillageId || !units) {
      return reply.status(400).send({ message: 'defenderVillageId et units sont requis' });
    }

    try {
      // Vérifier la propriété du village attaquant
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Ce village ne vous appartient pas' });
      }

      const result = await fastify.combatService.sendAttack(id, defenderVillageId, units);
      return result;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // GET /api/villages/:id/reports
  // Récupère les rapports de combat d'un village
  fastify.get('/:id/reports', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id }   = request.params as { id: string };
    const player   = request.user as { id: string };

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé' });
      }

      return await fastify.combatService.getReports(id);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
}
