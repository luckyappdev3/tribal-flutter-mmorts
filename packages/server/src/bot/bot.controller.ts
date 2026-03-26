// ─────────────────────────────────────────────────────────────
// bot.controller.ts — Endpoint admin GET /admin/bots/status
// 23.2 — Observabilité en production
// ─────────────────────────────────────────────────────────────

import { FastifyInstance } from 'fastify';

export async function botAdminRoutes(fastify: FastifyInstance) {

  // GET /admin/bots/status — liste tous les bots actifs avec leur phase et dernière action
  fastify.get('/status', async (_request, reply) => {
    const statuses = fastify.botService.getAllStatuses();
    return reply.send({
      count: statuses.length,
      bots:  statuses,
    });
  });

  // GET /admin/bots/:villageId/logs — 50 dernières entrées de log pour un bot
  fastify.get('/:villageId/logs', async (request, reply) => {
    const { villageId } = request.params as { villageId: string };
    const logs = fastify.botService.getBotLogs(villageId);
    if (!logs) {
      return reply.status(404).send({ message: `Bot introuvable : ${villageId}` });
    }
    return reply.send({ villageId, count: logs.length, logs });
  });
}
