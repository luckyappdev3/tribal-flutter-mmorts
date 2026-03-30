import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  ProductionFormulas,
  calculateCostForLevel,
  calculateTimeForLevel,
  calcMaxStorage,
  calcMaxPopulation,
  calcBuildingPopCost,
  calcTotalPopUsed,
} from '@mmorts/shared';
import { getVillageGameSpeed } from '../game/game-speed.utils';

const PRODUCTION_BUILDINGS = ['timber_camp', 'quarry', 'iron_mine'];

async function getGameSpeed(fastify: FastifyInstance, villageId: string): Promise<number> {
  return await getVillageGameSpeed(fastify.prisma, villageId);
}

export async function villageRoutes(fastify: FastifyInstance) {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: 'Authentification requise' });
    }
  });

  // ── GET /villages/my — liste tous les villages du joueur connecté ──
  fastify.get('/my', async (request: FastifyRequest, reply: FastifyReply) => {
    const player = request.user as { id: string };

    // Déterminer si le joueur est dans une Game active
    const activeGame = await fastify.prisma.game.findFirst({
      where: {
        playerId: player.id,
        status: { in: ['running', 'finished'] },
      },
      select: { id: true },
    });

    const villages = await fastify.prisma.village.findMany({
      where: {
        playerId: player.id,
        // Phase 8 : si le joueur est dans une Game, afficher seulement les villages de cette Game
        // Sinon : afficher les villages du GameWorld classique (gameId=null)
        ...(activeGame ? { gameId: activeGame.id } : { gameId: null }),
      },
      select:  { id: true, name: true, x: true, y: true, loyaltyPoints: true },
      orderBy: { name: 'asc' },
    });
    return villages;
  });

  // ── POST /villages/spawn — recrée un village de départ (après conquête) ──
  fastify.post('/spawn', async (request: FastifyRequest, reply: FastifyReply) => {
    const player = request.user as { id: string; username: string };

    // Trouver une position libre
    const existing = await fastify.prisma.village.findMany({ select: { x: true, y: true } });
    const taken = new Set(existing.map((v: { x: number; y: number }) => `${v.x},${v.y}`));
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * 41);
      y = Math.floor(Math.random() * 41);
    } while (taken.has(`${x},${y}`));

    const world = await fastify.prisma.gameWorld.findFirst({ select: { id: true } });

    const village = await fastify.prisma.village.create({
      data: {
        name:    `Village de ${player.username}`,
        x, y,
        ...(world ? { worldId: world.id } : {}),
        playerId: player.id,
        buildings: {
          create: [
            { buildingId: 'headquarters', level: 1 },
            { buildingId: 'timber_camp',  level: 1 },
            { buildingId: 'quarry',       level: 1 },
            { buildingId: 'iron_mine',    level: 1 },
            { buildingId: 'warehouse',    level: 1 },
            { buildingId: 'barracks',     level: 1 },
          ],
        },
      },
      select: { id: true, name: true, x: true, y: true },
    });

    return village;
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string };

    try {
      const village = await fastify.villageService.updateResources(id);

      if (village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé à ce village' });
      }

      const [buildings, gameSpeed] = await Promise.all([
        fastify.prisma.buildingInstance.findMany({ where: { villageId: id } }),
        getGameSpeed(fastify, id),
      ]);

      const getLevel = (bid: string) =>
        buildings.find(b => b.buildingId === bid)?.level || 0;

      const productionRates = {
        wood:  ProductionFormulas.getHourlyRate(getLevel('timber_camp')) / 3600 * gameSpeed,
        stone: ProductionFormulas.getHourlyRate(getLevel('quarry'))      / 3600 * gameSpeed,
        iron:  ProductionFormulas.getHourlyRate(getLevel('iron_mine'))   / 3600 * gameSpeed,
      };

      const buildQueueItem = await fastify.prisma.buildingQueueItem.findFirst({
        where:   { villageId: id, position: 0 },
        orderBy: { startsAt: 'asc' },
      });

      const buildQueue = buildQueueItem
        ? {
            buildingId:  buildQueueItem.buildingId,
            targetLevel: buildQueueItem.targetLevel,
            endsAt:      buildQueueItem.endsAt.toISOString(),
          }
        : null;

      return {
        ...village,
        productionRates,
        buildQueue,
        maxStorage: calcMaxStorage(getLevel('warehouse')),
        gameSpeed,  // ← Inclure gameSpeed pour que l'app affiche les vraies vitesses
      };
    } catch (error) {
      return reply.status(404).send({ message: 'Village non trouvé' });
    }
  });

  fastify.get('/:id/buildings', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const player = request.user as { id: string };

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id },
        select: { playerId: true },
      });

      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: 'Accès refusé' });
      }

      const [instances, queueItems, gameSpeed, troops, activeAttacks, recruitQueues, activeSupports] = await Promise.all([
        fastify.prisma.buildingInstance.findMany({ where: { villageId: id } }),
        fastify.prisma.buildingQueueItem.findMany({
          where:   { villageId: id },
          orderBy: { position: 'asc' },
        }),
        getGameSpeed(fastify, id),
        fastify.prisma.troop.findMany({ where: { villageId: id } }),
        fastify.prisma.activeAttack.findMany({
          where: { attackerVillageId: id, status: { in: ['traveling', 'returning'] } },
          select: { units: true, survivors: true, status: true },
        }),
        fastify.prisma.recruitQueue.findMany({ where: { villageId: id } }),
        (fastify.prisma as any).activeSupport.findMany({
          where:  { fromVillageId: id },
          select: { units: true },
        }),
      ]);

      const activeItem = queueItems.find(i => i.position === 0) ?? null;
      const queue = activeItem
        ? {
            buildingId:  activeItem.buildingId,
            targetLevel: activeItem.targetLevel,
            endsAt:      activeItem.endsAt.toISOString(),
          }
        : null;

      const instanceMap = new Map(instances.map(b => [b.buildingId, b.level]));
      const allBuildings = fastify.gameData.getAllBuildings();

      const enrichedBuildings = allBuildings.map(def => {
        const currentLevel = instanceMap.get(def.id) ?? 0;
        const nextLevel    = currentLevel + 1;

        let nextLevelCost: { wood: number; stone: number; iron: number } | null = null;
        let nextLevelTimeSec: number | null = null;
        let nextLevelPopCost: number | null = null;
        let currentProdPerSec: number | null = null;
        let nextProdPerSec: number | null = null;

        if (nextLevel <= def.maxLevel) {
          const cost    = calculateCostForLevel(def, nextLevel);
          nextLevelCost = { wood: cost.wood, stone: cost.stone, iron: cost.iron };

          const baseSec    = calculateTimeForLevel(def, nextLevel);
          const hqLevel    = instanceMap.get('headquarters') ?? 0;
          const hqBonus    = Math.max(0.1, 1 - hqLevel * 0.05);
          nextLevelTimeSec = Math.max(1, Math.floor(baseSec * hqBonus / gameSpeed));

          // Coût en population = valeur directe du tableau pour le niveau cible
          nextLevelPopCost = calcBuildingPopCost(def.id, nextLevel);
        }

        if (PRODUCTION_BUILDINGS.includes(def.id)) {
          currentProdPerSec = ProductionFormulas.getHourlyRate(currentLevel) / 3600 * gameSpeed;
          nextProdPerSec    = nextLevel <= def.maxLevel
            ? ProductionFormulas.getHourlyRate(nextLevel) / 3600 * gameSpeed
            : null;
        }

        // ── Prérequis manquants ─────────────────────────────────
        const prereqs = def.prerequisites ?? {};
        const missingPrerequisites = Object.entries(prereqs)
          .filter(([bid, req]) => (instanceMap.get(bid) ?? 0) < (req as number))
          .map(([bid, req]) => ({
            buildingId: bid,
            required:   req as number,
            current:    instanceMap.get(bid) ?? 0,
          }));
        const isLocked = currentLevel === 0 && missingPrerequisites.length > 0;

        return {
          buildingId:           def.id,
          level:                currentLevel,
          nextLevelCost,
          nextLevelTimeSec,
          nextLevelPopCost,
          currentProdPerSec,
          nextProdPerSec,
          isLocked,
          missingPrerequisites,
        };
      });

      // ── Population globale du village ─────────────────────────
      const allBuildingData = Array.from(instanceMap.entries()).map(
        ([buildingId, level]) => ({ buildingId, level }),
      );
      const farmLevel = instanceMap.get('farm') ?? 1;
      const popMax    = calcMaxPopulation(farmLevel);
      const buildingPopUsed = calcTotalPopUsed(allBuildingData);
      const troopsPopUsed   = troops.reduce((sum, t) => {
        try {
          const def = fastify.gameData.getUnitDef(t.unitType);
          return sum + t.count * (def.populationCost ?? 1);
        } catch { return sum; }
      }, 0);
      const attackPopUsed = activeAttacks.reduce((sum, attack) => {
        const rawUnits = attack.status === 'returning' && attack.survivors
          ? attack.survivors as Record<string, number>
          : attack.units as Record<string, number>;
        if (!rawUnits || typeof rawUnits !== 'object') return sum;
        return sum + Object.entries(rawUnits).reduce((s, [unitType, count]) => {
          if (!count) return s;
          try {
            const def = fastify.gameData.getUnitDef(unitType);
            return s + count * (def.populationCost ?? 1);
          } catch { return s; }
        }, 0);
      }, 0);
      const recruitPopUsed = recruitQueues.reduce((sum, q) => {
        const pending = q.totalCount - q.trainedCount;
        if (pending <= 0) return sum;
        try {
          const def = fastify.gameData.getUnitDef(q.unitType);
          return sum + pending * (def.populationCost ?? 1);
        } catch { return sum; }
      }, 0);
      const supportPopUsed = (activeSupports as any[]).reduce((sum: number, s: any) => {
        if (!s.units || typeof s.units !== 'object') return sum;
        return sum + Object.entries(s.units as Record<string, number>).reduce((acc, [unitType, count]) => {
          if (!count) return acc;
          try { return acc + count * (fastify.gameData.getUnitDef(unitType).populationCost ?? 1); }
          catch { return acc; }
        }, 0);
      }, 0);
      const popUsed = buildingPopUsed + troopsPopUsed + attackPopUsed + supportPopUsed + recruitPopUsed;

      return {
        buildings:  enrichedBuildings,
        queue,
        queueCount: queueItems.length,
        queueItems: queueItems.map(i => ({
          buildingId:  i.buildingId,
          targetLevel: i.targetLevel,
          position:    i.position,
          endsAt:      i.endsAt.toISOString(),
        })),
        popUsed,
        popMax,
      };
    } catch (error) {
      return reply.status(404).send({ message: 'Village non trouvé' });
    }
  });

  fastify.post('/:id/upgrade', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { buildingId } = request.body as { buildingId: string };
    const player = request.user as { id: string };

    if (!buildingId) {
      return reply.status(400).send({ message: 'buildingId est requis' });
    }

    try {
      const village = await fastify.prisma.village.findUnique({
        where: { id },
        select: { playerId: true },
      });

      if (!village || village.playerId !== player.id) {
        return reply.status(403).send({ message: "Ce village ne vous appartient pas" });
      }

      const result = await fastify.constructionService.startUpgrade(id, buildingId);
      return result;
    } catch (error: any) {
      console.log('❌ [UPGRADE ERROR]', error.message);
      return reply.status(400).send({ error: error.message });
    }
  });
}