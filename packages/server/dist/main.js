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
// Moteurs et Services
const game_data_registry_1 = require("./engine/game-data-registry");
const build_queue_1 = require("./engine/queue/queues/build.queue");
const village_service_1 = require("./modules/village/village.service");
const construction_service_1 = require("./modules/construction/construction.service");
const auth_service_1 = require("./modules/auth/auth.service");
const socket_server_1 = require("./infra/ws/socket.server");
const resource_tick_worker_1 = require("./workers/resource-tick.worker");
const resource_tick_queue_1 = require("./engine/queue/queues/resource-tick.queue");
// Contrôleurs
const village_controller_1 = require("./modules/village/village.controller");
const auth_controller_1 = require("./modules/auth/auth.controller");
const map_controller_1 = require("./modules/map/map.controller"); // ← nouveau
// Workers
const build_worker_1 = require("./workers/build.worker");
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
        const villageService = new village_service_1.VillageService(prisma);
        const constructionService = new construction_service_1.ConstructionService(prisma, buildQueue, gameDataRegistry, villageService);
        const authService = new auth_service_1.AuthService(prisma, fastify);
        fastify.decorate('prisma', prisma);
        fastify.decorate('gameData', gameDataRegistry);
        fastify.decorate('villageService', villageService);
        fastify.decorate('constructionService', constructionService);
        fastify.decorate('authService', authService);
        fastify.ready(async (err) => {
            if (err)
                throw err;
            (0, socket_server_1.initSocketServer)(fastify);
            await (0, resource_tick_queue_1.startGlobalResourceTick)();
            fastify.log.info('⏱️ Game Ticker activé');
        });
        // Routes
        await fastify.register(auth_controller_1.authRoutes, { prefix: '/api/auth' });
        await fastify.register(village_controller_1.villageRoutes, { prefix: '/api/villages' });
        await fastify.register(map_controller_1.mapRoutes, { prefix: '/api/map' }); // ← nouveau
        (0, build_worker_1.initBuildWorker)(fastify);
        fastify.log.info('👷 Worker de construction prêt');
        if (resource_tick_worker_1.resourceTickWorker) {
            fastify.log.info('🤖 Worker de ressources prêt');
        }
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
