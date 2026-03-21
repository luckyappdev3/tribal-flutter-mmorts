"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankingRoutes = rankingRoutes;
async function rankingRoutes(fastify) {
    fastify.addHook('preHandler', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch {
            reply.status(401).send({ message: 'Authentification requise' });
        }
    });
    // GET /api/ranking?page=1&limit=50
    fastify.get('/', async (request, reply) => {
        const { page = 1, limit = 50 } = request.query;
        try {
            const players = await fastify.prisma.player.findMany({
                orderBy: { totalPoints: 'desc' },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
                select: {
                    id: true,
                    username: true,
                    totalPoints: true,
                    villages: { select: { name: true, x: true, y: true }, take: 1 },
                },
            });
            return players.map((p, index) => ({
                rank: (Number(page) - 1) * Number(limit) + index + 1,
                playerId: p.id,
                username: p.username,
                totalPoints: p.totalPoints,
                villageName: p.villages[0]?.name ?? '—',
            }));
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
}
