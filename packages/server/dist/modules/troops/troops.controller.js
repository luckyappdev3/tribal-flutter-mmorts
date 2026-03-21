"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.troopsRoutes = troopsRoutes;
async function troopsRoutes(fastify) {
    fastify.addHook('preHandler', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch {
            reply.status(401).send({ message: 'Authentification requise' });
        }
    });
    // GET /api/villages/:id/troops
    // Retourne les troupes disponibles + la queue de recrutement
    fastify.get('/:id/troops', async (request, reply) => {
        const { id } = request.params;
        const player = request.user;
        try {
            const village = await fastify.prisma.village.findUnique({
                where: { id }, select: { playerId: true },
            });
            if (!village || village.playerId !== player.id) {
                return reply.status(403).send({ message: 'Accès refusé' });
            }
            return await fastify.troopsService.getTroops(id);
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    // POST /api/villages/:id/recruit
    // Lance un recrutement
    fastify.post('/:id/recruit', async (request, reply) => {
        const { id } = request.params;
        const { unitType, count } = request.body;
        const player = request.user;
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
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
