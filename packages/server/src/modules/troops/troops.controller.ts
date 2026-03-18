import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function troopsRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  // GET /api/villages/:id/troops
  // Retourne les troupes disponibles + la queue de recrutement
  fastify.get('/:id/troops', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id }   = request.params as { id: string };
    const player   = request.user as { id: string };

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé' });
      }

      return await fastify.troopsService.getTroops(id);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // POST /api/villages/:id/recruit
  // Lance un recrutement
  fastify.post('/:id/recruit', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id }               = request.params as { id: string };
    const { unitType, count }  = request.body as { unitType: string; count: number };
    const player               = request.user as { id: string };

    if (!unitType || !count) {
      return reply.status(400).send({ message: 'unitType et count sont requis' });
    }

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Ce village ne vous appartient pas' });
      }

      const result = await fastify.troopsService.startRecruit(id, unitType, count);
      return result;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
