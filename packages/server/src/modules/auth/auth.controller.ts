import { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance) {
  const { authService } = fastify;

  // POST /api/auth/register
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password, botDifficulty } = request.body as any;
      const player = await authService.register({ username, email, password, botDifficulty });
      const token  = authService.generateToken(player);
      const village = player.villages[0];

      return reply.code(201).send({
        token,
        player:    { id: player.id, username: player.username },
        villageId: village?.id,
        villageX:  village?.x ?? 20,
        villageY:  village?.y ?? 20,
      });
    } catch (error: any) {
      return reply.status(400).send({ message: error.message });
    }
  });

  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body as any;
      const player = await authService.login(email, password);
      const token  = authService.generateToken(player);

      // Récupérer le village avec ses coordonnées
      const village = await fastify.prisma.village.findFirst({
        where:  { playerId: player.id },
        select: { id: true, x: true, y: true },
      });

      return {
        token,
        player:    { id: player.id, username: player.username },
        villageId: village?.id,
        villageX:  village?.x ?? 20,
        villageY:  village?.y ?? 20,
      };
    } catch (error: any) {
      return reply.status(401).send({ message: 'Identifiants invalides' });
    }
  });
}
