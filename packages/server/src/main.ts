import Fastify from 'fastify';
import * as dotenv from 'dotenv';
import cors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import fastifyJwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';

import { GameDataRegistry }       from './engine/game-data-registry';
import { BuildingQueue }          from './engine/queue/queues/build.queue';
import { RecruitQueue }           from './engine/queue/queues/recruit.queue';
import { AttackQueue }            from './engine/queue/queues/attack.queue';
import { VillageService }         from './modules/village/village.service';
import { ConstructionService }    from './modules/construction/construction.service';
import { AuthService }            from './modules/auth/auth.service';
import { TroopsService }          from './modules/troops/troops.service';
import { CombatService }          from './modules/combat/combat.service';
import { AbandonedVillageService } from './modules/abandoned/abandoned.service';

import { initSocketServer }        from './infra/ws/socket.server';
import { resourceTickWorker }      from './workers/resource-tick.worker';
import { startGlobalResourceTick } from './engine/queue/queues/resource-tick.queue';

import { villageRoutes }   from './modules/village/village.controller';
import { authRoutes }      from './modules/auth/auth.controller';
import { mapRoutes }       from './modules/map/map.controller';
import { troopsRoutes }    from './modules/troops/troops.controller';
import { combatRoutes }    from './modules/combat/combat.controller';
import { movementsRoutes } from './modules/combat/movements.controller';
import { rankingRoutes }   from './modules/ranking/ranking.controller';

import { initBuildWorker }   from './workers/build.worker';
import { initRecruitWorker } from './workers/recruit.worker';
import { initAttackWorker }  from './workers/attack.worker';

dotenv.config();

declare module 'fastify' {
  interface FastifyInstance {
    prisma:              PrismaClient;
    villageService:      VillageService;
    constructionService: ConstructionService;
    authService:         AuthService;
    gameData:            GameDataRegistry;
    troopsService:       TroopsService;
    combatService:       CombatService;
    attackQueue:         AttackQueue;
    abandonedService:    AbandonedVillageService;
    buildQueue: BuildingQueue;
  }
}

const fastify = Fastify({ logger: true });
const prisma  = new PrismaClient();

async function bootstrap() {
  try {
    await prisma.$connect();
    fastify.log.info('✅ Base de données connectée');

    await fastify.register(cors, { origin: true });
    await fastify.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'mmo-super-secret-key-2026',
    });

    const gameDataRegistry    = new GameDataRegistry();
    await gameDataRegistry.loadAll();

    const buildQueue          = new BuildingQueue();
    const recruitQueue        = new RecruitQueue();
    const attackQueue         = new AttackQueue();
    const villageService      = new VillageService(prisma);
    const constructionService = new ConstructionService(prisma, buildQueue, gameDataRegistry, villageService);
    const authService         = new AuthService(prisma, fastify);
    const troopsService       = new TroopsService(prisma, gameDataRegistry, recruitQueue);
    const combatService       = new CombatService(prisma, gameDataRegistry, attackQueue);
    const abandonedService    = new AbandonedVillageService(prisma);

    fastify.decorate('prisma',              prisma);
    fastify.decorate('gameData',            gameDataRegistry);
    fastify.decorate('villageService',      villageService);
    fastify.decorate('constructionService', constructionService);
    fastify.decorate('authService',         authService);
    fastify.decorate('troopsService',       troopsService);
    fastify.decorate('combatService',       combatService);
    fastify.decorate('attackQueue',         attackQueue);
    fastify.decorate('abandonedService',    abandonedService);
    fastify.decorate('buildQueue', buildQueue);

    // Spawn des villages abandonnés au démarrage
    await abandonedService.seedAbandoned();

    fastify.ready(async (err) => {
      if (err) throw err;
      initSocketServer(fastify);
      await startGlobalResourceTick();
      fastify.log.info('⏱️ Game Ticker activé');
    });

    await fastify.register(authRoutes,      { prefix: '/api/auth' });
    await fastify.register(villageRoutes,   { prefix: '/api/villages' });
    await fastify.register(mapRoutes,       { prefix: '/api/map' });
    await fastify.register(troopsRoutes,    { prefix: '/api/villages' });
    await fastify.register(combatRoutes,    { prefix: '/api/villages' });
    await fastify.register(movementsRoutes, { prefix: '/api/villages' });
    await fastify.register(rankingRoutes,   { prefix: '/api/ranking' });

    initBuildWorker(fastify);
    initRecruitWorker(fastify);
    initAttackWorker(fastify);
    fastify.log.info('👷 Workers prêts');

    if (resourceTickWorker) fastify.log.info('🤖 Worker ressources prêt');

    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Serveur prêt sur le port ${port}`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
