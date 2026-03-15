import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function villageRoutes(fastify: FastifyInstance) {
  
  /**
   * PROTECTION GLOBALE : 
   * On ajoute un hook qui vérifie le JWT pour TOUTES les routes de ce fichier.
   */
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: 'Authentification requise (Token manquant ou invalide)' });
    }
  });

  // GET /api/villages/:id
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string }; // Récupéré du Token

    try {
      // 1. Calcul des ressources (Production passive)
      const village = await fastify.villageService.updateResources(id);

      // 2. Sécurité : Vérifier que c'est bien le village du joueur
      if (village.playerId !== player.id) {
        return reply.status(403).send({ message: "Accès refusé à ce village" });
      }

      return village;
    } catch (error) {
      return reply.status(404).send({ message: "Village non trouvé" });
    }
  });

  // POST /api/villages/:id/upgrade
  fastify.post('/:id/upgrade', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { buildingId } = request.body as { buildingId: string };
    const player = request.user as { id: string };

    if (!buildingId) {
      return reply.status(400).send({ message: "buildingId est requis" });
    }

    try {
      // 1. Vérifier la propriété avant de dépenser des ressources
      const village = await fastify.prisma.village.findUnique({
        where: { id },
        select: { playerId: true }
      });

      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: "Action interdite : ce village ne vous appartient pas" });
      }

      // 2. Lancer la construction via le service
      const result = await fastify.constructionService.startUpgrade(id, buildingId);
      return result;
      
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}