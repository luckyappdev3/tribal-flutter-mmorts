// ─────────────────────────────────────────────────────────────
// game.controller.ts — Phase 8 : Endpoints Lobby
//
// POST /api/games              → créer une partie (status: lobby)
// POST /api/games/:id/start    → démarrer (génère villages + bots)
// GET  /api/games/:id          → état de la partie
// ─────────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';

export async function gameRoutes(fastify: FastifyInstance) {
  const { gameService } = fastify;

  // ── POST /api/games ────────────────────────────────────────
  // Corps : { botCount: 1–7, botLevel: 1–10, gameSpeed: 1–20000 }
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const playerId = (request.user as any).id;
      const { botCount, botLevel, gameSpeed } = request.body as any;

      // Validation
      const bots  = Math.max(1, Math.min(7,     parseInt(botCount)  || 3));
      const level = Math.max(1, Math.min(10,    parseInt(botLevel)  || 5));
      const speed = Math.max(1, Math.min(20000, parseFloat(gameSpeed) || 1));

      const game = await gameService.createGame(playerId, bots, level, speed);
      return reply.code(201).send({ gameId: game.id, status: game.status });
    } catch (err: any) {
      return reply.code(400).send({ message: err.message });
    }
  });

  // ── POST /api/games/:id/start ──────────────────────────────
  fastify.post('/:id/start', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const playerId = (request.user as any).id;
      const gameId   = (request.params as any).id as string;

      const result = await gameService.startGame(gameId, playerId);
      return reply.code(200).send(result);
    } catch (err: any) {
      return reply.code(400).send({ message: err.message });
    }
  });

  // ── GET /api/games/:id ─────────────────────────────────────
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const playerId = (request.user as any).id;
      const gameId   = (request.params as any).id as string;

      const game = await gameService.getGame(gameId, playerId);
      return reply.send(game);
    } catch (err: any) {
      return reply.code(404).send({ message: err.message });
    }
  });
}
