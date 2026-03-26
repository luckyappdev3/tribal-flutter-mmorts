import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function mapRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  // GET /api/map?x=20&y=20&radius=20
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { x = 20, y = 20, radius = 20 } = request.query as {
      x?: number; y?: number; radius?: number;
    };

    const cx     = Number(x);
    const cy     = Number(y);
    const r      = Number(radius);
    const player = request.user as { id: string };

    try {
      // Tous les villages dans la zone
      const villages = await fastify.prisma.village.findMany({
        where: {
          x: { gte: cx - r, lte: cx + r },
          y: { gte: cy - r, lte: cy + r },
        },
        select: {
          id:             true,
          name:           true,
          x:              true,
          y:              true,
          isAbandoned:    true,
          abandonedLevel: true,
          loyaltyPoints:  true,
          playerId:       true,
          player: {
            select: {
              id:          true,
              username:    true,
              totalPoints: true,
            },
          },
        },
      });

      // Villages du joueur connecté (tous, pas seulement le courant)
      const ownVillageIds = new Set(
        villages.filter(v => v.playerId === player.id).map(v => v.id)
      );

      // Villages récemment conquis (rapport de conquête dans les dernières 24h)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const conquestReports = await fastify.prisma.combatReport.findMany({
        where: {
          type:      'conquest',
          createdAt: { gte: since },
        },
        select:  { defenderVillageId: true },
        distinct: ['defenderVillageId'],
      });
      const recentlyConqueredIds = new Set(conquestReports.map(r => r.defenderVillageId));

      return villages.map(v => ({
        id:             v.id,
        name:           v.name,
        x:              v.x,
        y:              v.y,
        isAbandoned:    v.isAbandoned,
        abandonedLevel: v.abandonedLevel,
        // loyaltyPoints visible uniquement pour ses propres villages
        loyaltyPoints:  ownVillageIds.has(v.id) ? v.loyaltyPoints : null,
        isRecentlyConquered: recentlyConqueredIds.has(v.id),
        player: v.player,
      }));
    } catch (error) {
      return reply.status(500).send({ message: 'Erreur serveur' });
    }
  });
}
