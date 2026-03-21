"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combatRoutes = combatRoutes;
async function combatRoutes(fastify) {
    fastify.addHook('preHandler', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch {
            reply.status(401).send({ message: 'Authentification requise' });
        }
    });
    // POST /api/villages/:id/attack
    // Lance une attaque depuis le village :id vers defenderVillageId
    fastify.post('/:id/attack', async (request, reply) => {
        const { id } = request.params;
        const { defenderVillageId, units } = request.body;
        const player = request.user;
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
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // GET /api/villages/:id/reports
    // Récupère les rapports de combat d'un village
    fastify.get('/:id/reports', async (request, reply) => {
        const { id } = request.params;
        const player = request.user;
        try {
            const village = await fastify.prisma.village.findUnique({
                where: { id }, select: { playerId: true },
            });
            if (!village || village.playerId !== player.id) {
                return reply.status(403).send({ message: 'Accès refusé' });
            }
            return await fastify.combatService.getReports(id);
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
}
