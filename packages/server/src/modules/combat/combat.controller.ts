import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { calculateTravelTime } from '@mmorts/shared';

export async function combatRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  // POST /api/villages/:id/attack
  // Lance une attaque depuis le village :id vers defenderVillageId
  fastify.post('/:id/attack', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id }                                          = request.params as { id: string };
    const { defenderVillageId, units, catapultTarget }    = request.body as {
      defenderVillageId: string;
      units: Record<string, number>;
      catapultTarget?: string;
    };
    const player = request.user as { id: string };

    if (!defenderVillageId || !units) {
      return reply.status(400).send({ message: 'defenderVillageId et units sont requis' });
    }

    if ((units['noble'] ?? 0) > 1) {
      return reply.status(400).send({ message: 'Un seul noble par attaque est autorisé' });
    }

    try {
      // Vérifier la propriété du village attaquant
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Ce village ne vous appartient pas' });
      }

      const result = await fastify.combatService.sendAttack(id, defenderVillageId, units, catapultTarget);
      return result;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // POST /api/villages/:id/scout
  // Envoie des éclaireurs vers un village cible
  fastify.post('/:id/scout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id }                           = request.params as { id: string };
    const { defenderVillageId, scoutCount } = request.body as {
      defenderVillageId: string;
      scoutCount: number;
    };
    const player = request.user as { id: string };

    if (!defenderVillageId || !scoutCount) {
      return reply.status(400).send({ message: 'defenderVillageId et scoutCount sont requis' });
    }

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Ce village ne vous appartient pas' });
      }

      const result = await fastify.combatService.sendScout(id, defenderVillageId, scoutCount);
      return result;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // POST /api/villages/:id/support
  // Envoie des troupes en renfort vers un village allié
  fastify.post('/:id/support', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id }                          = request.params as { id: string };
    const { targetVillageId, units }      = request.body as { targetVillageId: string; units: Record<string, number> };
    const player                          = request.user as { id: string };

    if (!targetVillageId || !units || Object.values(units).every(c => c <= 0)) {
      return reply.status(400).send({ message: 'targetVillageId et units sont requis' });
    }

    try {
      // Vérifier que le village source appartient au joueur
      const fromVillage = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true, x: true, y: true },
      });
      if (!fromVillage || fromVillage.playerId !== player.id) {
        return reply.status(403).send({ message: 'Ce village ne vous appartient pas' });
      }

      // Vérifier que la cible appartient aussi au joueur
      const toVillage = await fastify.prisma.village.findUnique({
        where: { id: targetVillageId }, select: { playerId: true, x: true, y: true },
      });
      if (!toVillage || toVillage.playerId !== player.id) {
        return reply.status(403).send({ message: 'Vous pouvez uniquement envoyer des renforts à vos propres villages' });
      }
      if (targetVillageId === id) {
        return reply.status(400).send({ message: 'Impossible de s\'envoyer des renforts à soi-même' });
      }

      // Vérifier dispo des troupes et déduire
      const { getVillageGameSpeed } = await import('../game/game-speed.utils');
      const gameSpeed = await getVillageGameSpeed(fastify.prisma, id);

      // Vitesse = unité la plus lente parmi les types envoyés
      let slowestSpeed = 0;
      for (const [unitType, count] of Object.entries(units)) {
        if (count <= 0) continue;
        const troop = await fastify.prisma.troop.findUnique({
          where: { villageId_unitType: { villageId: id, unitType } },
        });
        if (!troop || troop.count < count) {
          return reply.status(400).send({ message: `Pas assez de ${unitType} disponibles` });
        }
        const def = fastify.gameData.getUnitDef(unitType);
        if (def.speed > slowestSpeed) slowestSpeed = def.speed;
      }

      const travelSec = calculateTravelTime(
        fromVillage.x, fromVillage.y,
        toVillage.x,   toVillage.y,
        slowestSpeed, gameSpeed,
      );
      const travelMs  = travelSec * 1000;
      const arrivesAt = new Date(Date.now() + travelMs);

      // Déduire les troupes + créer le support
      const cleanUnits = Object.fromEntries(Object.entries(units).filter(([, c]) => c > 0));

      const support = await fastify.prisma.$transaction(async (tx: any) => {
        for (const [unitType, count] of Object.entries(cleanUnits)) {
          await tx.troop.update({
            where: { villageId_unitType: { villageId: id, unitType } },
            data:  { count: { decrement: count } },
          });
        }
        return tx.activeSupport.create({
          data: { fromVillageId: id, toVillageId: targetVillageId, units: cleanUnits, arrivesAt },
        });
      });

      // Planifier l'arrivée
      await (fastify as any).supportQueue.addJob(
        { supportId: support.id, fromVillageId: id, toVillageId: targetVillageId, units: cleanUnits, travelMs },
        travelMs,
      );

      return { supportId: support.id, travelSec, arrivesAt };
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // DELETE /api/villages/:id/support/:supportId
  // Rappel de troupes depuis un village de garnison
  fastify.delete('/:id/support/:supportId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, supportId } = request.params as { id: string; supportId: string };
    const player            = request.user as { id: string };

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true, x: true, y: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé' });
      }

      const support = await fastify.prisma.activeSupport.findUnique({
        where: { id: supportId },
        include: { toVillage: { select: { x: true, y: true } } },
      });
      if (!support || support.fromVillageId !== id) {
        return reply.status(404).send({ message: 'Support introuvable' });
      }
      if (support.status === 'returning') {
        return reply.status(400).send({ message: 'Ce renfort est déjà en route de retour' });
      }

      const world     = await fastify.prisma.gameWorld.findFirst({ select: { gameSpeed: true } });
      const gameSpeed = world?.gameSpeed ?? 1.0;
      const units     = support.units as Record<string, number>;

      // Vitesse retour = unité la plus lente
      let slowestSpeed = 0;
      for (const unitType of Object.keys(units)) {
        try {
          const def = fastify.gameData.getUnitDef(unitType);
          if (def.speed > slowestSpeed) slowestSpeed = def.speed;
        } catch { /* skip unknown */ }
      }

      const travelSec = calculateTravelTime(
        support.toVillage.x, support.toVillage.y,
        village.x, village.y,
        slowestSpeed, gameSpeed,
      );
      const travelMs  = travelSec * 1000;
      const arrivesAt = new Date(Date.now() + travelMs);

      await fastify.prisma.activeSupport.update({
        where: { id: supportId },
        data:  { status: 'returning', arrivesAt },
      });

      await (fastify as any).supportQueue.addJob(
        { supportId, fromVillageId: id, toVillageId: support.toVillageId, units, returning: true, travelMs },
        travelMs,
      );

      return { travelSec, arrivesAt };
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // GET /api/villages/:id/supports
  // Renforts envoyés ou reçus par le village
  fastify.get('/:id/supports', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string };

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé' });
      }

      const [sent, received] = await Promise.all([
        fastify.prisma.activeSupport.findMany({
          where:   { fromVillageId: id },
          include: { toVillage: { select: { id: true, name: true, x: true, y: true } } },
          orderBy: { arrivesAt: 'asc' },
        }),
        fastify.prisma.activeSupport.findMany({
          where:   { toVillageId: id, status: { in: ['traveling', 'stationed'] } },
          include: { fromVillage: { select: { id: true, name: true, x: true, y: true } } },
          orderBy: { arrivesAt: 'asc' },
        }),
      ]);

      return { sent, received };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // GET /api/villages/me/combat-reports
  // Tous les rapports du joueur connecté (multi-village + conquêtes passées)
  fastify.get('/me/combat-reports', async (request: FastifyRequest, reply: FastifyReply) => {
    const player = request.user as { id: string };
    try {
      return await fastify.combatService.getPlayerCombatReports(player.id);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // GET /api/villages/:id/combat-reports
  // Récupère tous les rapports (combat + espionnage + combinés) d'un village
  fastify.get('/:id/combat-reports', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string };

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id }, select: { playerId: true },
      });
      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé' });
      }

      return await fastify.combatService.getCombatReports(id);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
}
