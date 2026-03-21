"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movementsRoutes = movementsRoutes;
async function movementsRoutes(fastify) {
    fastify.addHook('preHandler', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch {
            reply.status(401).send({ message: 'Authentification requise' });
        }
    });
    // GET /api/villages/:id/movements
    fastify.get('/:id/movements', async (request, reply) => {
        const { id } = request.params;
        const player = request.user;
        try {
            const village = await fastify.prisma.village.findUnique({
                where: { id }, select: { playerId: true },
            });
            if (!village || village.playerId !== player.id) {
                return reply.status(403).send({ message: 'Accès refusé' });
            }
            return await fastify.combatService.getMovements(id);
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
}
