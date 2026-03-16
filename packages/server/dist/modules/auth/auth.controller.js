"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
async function authRoutes(fastify) {
    const { authService } = fastify;
    // S'inscrire
    fastify.post('/register', async (request, reply) => {
        try {
            const player = await authService.register(request.body);
            const token = authService.generateToken(player);
            return reply.code(201).send({
                token,
                player: { id: player.id, username: player.username },
                // On renvoie l'ID du premier village créé automatiquement
                villageId: player.villages[0]?.id
            });
        }
        catch (error) {
            return reply.status(400).send({ message: error.message });
        }
    });
    // Se connecter
    fastify.post('/login', async (request, reply) => {
        try {
            const { email, password } = request.body;
            const player = await authService.login(email, password);
            const token = authService.generateToken(player);
            // Récupérer l'ID du village pour le front-end
            const village = await fastify.prisma.village.findFirst({
                where: { playerId: player.id }
            });
            return {
                token,
                player: { id: player.id, username: player.username },
                villageId: village?.id
            };
        }
        catch (error) {
            return reply.status(401).send({ message: "Identifiants invalides" });
        }
    });
}
