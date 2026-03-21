"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRoutes = mapRoutes;
async function mapRoutes(fastify) {
    fastify.addHook('preHandler', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch (err) {
            reply.status(401).send({ message: 'Authentification requise' });
        }
    });
    // GET /api/map?x=500&y=500&radius=15
    fastify.get('/', async (request, reply) => {
        const { x = 500, y = 500, radius = 15 } = request.query;
        const cx = Number(x);
        const cy = Number(y);
        const r = Number(radius);
        try {
            const villages = await fastify.prisma.village.findMany({
                where: {
                    x: { gte: cx - r, lte: cx + r },
                    y: { gte: cy - r, lte: cy + r },
                },
                select: {
                    id: true,
                    name: true,
                    x: true,
                    y: true,
                    isAbandoned: true, // ← nouveau
                    abandonedLevel: true, // ← nouveau
                    player: {
                        select: {
                            id: true,
                            username: true,
                            totalPoints: true,
                        },
                    },
                },
            });
            return villages;
        }
        catch (error) {
            return reply.status(500).send({ message: 'Erreur serveur' });
        }
    });
}
