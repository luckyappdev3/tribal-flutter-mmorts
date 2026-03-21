"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const dotenv = __importStar(require("dotenv"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const client_1 = require("@prisma/client");
const game_data_registry_1 = require("./engine/game-data-registry");
const build_queue_1 = require("./engine/queue/queues/build.queue");
const recruit_queue_1 = require("./engine/queue/queues/recruit.queue");
const attack_queue_1 = require("./engine/queue/queues/attack.queue");
const village_service_1 = require("./modules/village/village.service");
const construction_service_1 = require("./modules/construction/construction.service");
const auth_service_1 = require("./modules/auth/auth.service");
const troops_service_1 = require("./modules/troops/troops.service");
const combat_service_1 = require("./modules/combat/combat.service");
const abandoned_service_1 = require("./modules/abandoned/abandoned.service");
const socket_server_1 = require("./infra/ws/socket.server");
const resource_tick_worker_1 = require("./workers/resource-tick.worker");
const resource_tick_queue_1 = require("./engine/queue/queues/resource-tick.queue");
const village_controller_1 = require("./modules/village/village.controller");
const auth_controller_1 = require("./modules/auth/auth.controller");
const map_controller_1 = require("./modules/map/map.controller");
const troops_controller_1 = require("./modules/troops/troops.controller");
const combat_controller_1 = require("./modules/combat/combat.controller");
const movements_controller_1 = require("./modules/combat/movements.controller");
const ranking_controller_1 = require("./modules/ranking/ranking.controller");
const build_worker_1 = require("./workers/build.worker");
const recruit_worker_1 = require("./workers/recruit.worker");
const attack_worker_1 = require("./workers/attack.worker");
dotenv.config();
const fastify = (0, fastify_1.default)({ logger: true });
const prisma = new client_1.PrismaClient();
async function bootstrap() {
    try {
        await prisma.$connect();
        fastify.log.info('✅ Base de données connectée');
        await fastify.register(cors_1.default, { origin: true });
        await fastify.register(jwt_1.default, {
            secret: process.env.JWT_SECRET || 'mmo-super-secret-key-2026',
        });
        const gameDataRegistry = new game_data_registry_1.GameDataRegistry();
        await gameDataRegistry.loadAll();
        const buildQueue = new build_queue_1.BuildingQueue();
        const recruitQueue = new recruit_queue_1.RecruitQueue();
        const attackQueue = new attack_queue_1.AttackQueue();
        const villageService = new village_service_1.VillageService(prisma);
        const constructionService = new construction_service_1.ConstructionService(prisma, buildQueue, gameDataRegistry, villageService);
        const authService = new auth_service_1.AuthService(prisma, fastify);
        const troopsService = new troops_service_1.TroopsService(prisma, gameDataRegistry, recruitQueue);
        const combatService = new combat_service_1.CombatService(prisma, gameDataRegistry, attackQueue);
        const abandonedService = new abandoned_service_1.AbandonedVillageService(prisma);
        fastify.decorate('prisma', prisma);
        fastify.decorate('gameData', gameDataRegistry);
        fastify.decorate('villageService', villageService);
        fastify.decorate('constructionService', constructionService);
        fastify.decorate('authService', authService);
        fastify.decorate('troopsService', troopsService);
        fastify.decorate('combatService', combatService);
        fastify.decorate('attackQueue', attackQueue);
        fastify.decorate('abandonedService', abandonedService);
        fastify.decorate('buildQueue', buildQueue);
        // Spawn des villages abandonnés au démarrage
        await abandonedService.seedAbandoned();
        fastify.ready(async (err) => {
            if (err)
                throw err;
            (0, socket_server_1.initSocketServer)(fastify);
            await (0, resource_tick_queue_1.startGlobalResourceTick)();
            fastify.log.info('⏱️ Game Ticker activé');
        });
        await fastify.register(auth_controller_1.authRoutes, { prefix: '/api/auth' });
        await fastify.register(village_controller_1.villageRoutes, { prefix: '/api/villages' });
        await fastify.register(map_controller_1.mapRoutes, { prefix: '/api/map' });
        await fastify.register(troops_controller_1.troopsRoutes, { prefix: '/api/villages' });
        await fastify.register(combat_controller_1.combatRoutes, { prefix: '/api/villages' });
        await fastify.register(movements_controller_1.movementsRoutes, { prefix: '/api/villages' });
        await fastify.register(ranking_controller_1.rankingRoutes, { prefix: '/api/ranking' });
        (0, build_worker_1.initBuildWorker)(fastify);
        (0, recruit_worker_1.initRecruitWorker)(fastify);
        (0, attack_worker_1.initAttackWorker)(fastify);
        fastify.log.info('👷 Workers prêts');
        if (resource_tick_worker_1.resourceTickWorker)
            fastify.log.info('🤖 Worker ressources prêt');
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Serveur prêt sur le port ${port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
bootstrap();
