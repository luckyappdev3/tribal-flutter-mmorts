import { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance) {
  const { authService } = fastify;

  // POST /api/auth/register
  // Crée le compte uniquement — le village est créé depuis le lobby (Phase 8)
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password } = request.body as any;
      const player = await authService.register({ username, email, password });
      const token  = authService.generateToken(player);

      return reply.code(201).send({
        token,
        player:    { id: player.id, username: player.username },
        villageId: null,
      });
    } catch (error: any) {
      return reply.status(400).send({ message: error.message });
    }
  });

  // POST /api/auth/login
  // Si une partie est en cours → retourne le villageId, sinon null (→ lobby)
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body as any;
      const player = await authService.login(email, password);
      const token  = authService.generateToken(player);

      // Chercher la partie en cours du joueur
      const runningGame = await fastify.prisma.game.findFirst({
        where:   { playerId: player.id, status: 'running' },
        include: {
          villages: {
            where:  { playerId: player.id },
            select: { id: true, x: true, y: true },
          },
        },
      });
      const village = runningGame?.villages[0] ?? null;

      return {
        token,
        player:    { id: player.id, username: player.username },
        villageId: village?.id   ?? null,
        villageX:  village?.x    ?? null,
        villageY:  village?.y    ?? null,
      };
    } catch (error: any) {
      return reply.status(401).send({ message: 'Identifiants invalides' });
    }
  });
}
