import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function mapRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  // GET /api/map?x=500&y=500&radius=15
  // Retourne tous les villages dans un carré centré sur (x, y)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { x = 500, y = 500, radius = 15 } = request.query as {
      x?: number;
      y?: number;
      radius?: number;
    };

    const cx = Number(x);
    const cy = Number(y);
    const r  = Number(radius);

    try {
      const villages = await fastify.prisma.village.findMany({
        where: {
          x: { gte: cx - r, lte: cx + r },
          y: { gte: cy - r, lte: cy + r },
        },
        select: {
          id:   true,
          name: true,
          x:    true,
          y:    true,
          player: {
            select: {
              id:          true,
              username:    true,
              totalPoints: true,
            },
          },
        },
      });

      return villages;
    } catch (error) {
      return reply.status(500).send({ message: 'Erreur serveur' });
    }
  });
}
