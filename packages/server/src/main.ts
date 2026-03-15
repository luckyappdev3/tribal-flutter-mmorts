import Fastify from 'fastify';
import * as dotenv from 'dotenv';
import cors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import fastifyJwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';

// Moteurs et Services
import { GameDataRegistry } from './engine/game-data-registry';
import { BuildingQueue } from './engine/queue/queues/build.queue';
import { VillageService } from './modules/village/village.service';
import { ConstructionService } from './modules/construction/construction.service';
import { AuthService } from './modules/auth/auth.service';

// --- AJOUTS POUR L'ÉCONOMIE & TICKER ---
import { initSocketServer } from './infra/ws/socket.server';
import { resourceTickWorker } from './workers/resource-tick.worker';
import { startGlobalResourceTick } from './engine/queue/queues/resource-tick.queue';
// ---------------------------------------

// Contrôleurs (Routes)
import { villageRoutes } from './modules/village/village.controller';
import { authRoutes } from './modules/auth/auth.controller';

// Workers
import { initBuildWorker } from './workers/build.worker';

dotenv.config();

// 1. TYPAGE : Extension de l'instance Fastify
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    villageService: VillageService;
    constructionService: ConstructionService;
    authService: AuthService;
    gameData: GameDataRegistry;
  }
}

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();

async function bootstrap() {
  try {
    // A. Connexion BDD
    await prisma.$connect();
    fastify.log.info('✅ Base de données connectée');

    // B. ENREGISTREMENT DES PLUGINS
    await fastify.register(cors, { origin: true });
    await fastify.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'mmo-super-secret-key-2026'
    });

    // C. INITIALISATION DES MOTEURS DE JEU
    const gameDataRegistry = new GameDataRegistry();
    await gameDataRegistry.loadAll(); 

    const buildQueue = new BuildingQueue();
    const villageService = new VillageService(prisma);
    const constructionService = new ConstructionService(
      prisma,
      buildQueue,
      gameDataRegistry,
      villageService
    );
    const authService = new AuthService(prisma, fastify);

    // D. INJECTION (DECORATE)
    fastify.decorate('prisma', prisma);
    fastify.decorate('gameData', gameDataRegistry);
    fastify.decorate('villageService', villageService);
    fastify.decorate('constructionService', constructionService);
    fastify.decorate('authService', authService);

    // E. CONFIGURATION SOCKETS & TICKER
    // On attend que fastify soit prêt pour initialiser les sockets et le ticker
    fastify.ready(async (err) => {
      if (err) throw err;
      
      // 1. Initialise ton infrastructure Socket.io (via infra/ws/socket.server.ts)
      initSocketServer(fastify);
      
      // 2. Démarre la boucle de production globale (Ticker)
      await startGlobalResourceTick();
      fastify.log.info('⏱️ Game Ticker activé (Production de ressources)');
    });

    // F. ROUTES API
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(villageRoutes, { prefix: '/api/villages' });

    // G. INITIALISATION DES WORKERS
    // Worker de construction (Bâtiments)
    initBuildWorker(fastify);
    fastify.log.info('👷 Worker de construction prêt');

    // Worker de ressources (Economie) - Le simple import suffit à l'instancier
    // mais on s'assure qu'il est bien chargé ici
    if (resourceTickWorker) {
      fastify.log.info('🤖 Worker de ressources (Economy) prêt');
    }

    // H. LANCEMENT
    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`🚀 Serveur prêt et accessible sur le port ${port}`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();