"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceTickWorker = void 0;
const bullmq_1 = require("bullmq");
const economy_service_1 = require("../modules/economy/economy.service");
const rooms_1 = require("../infra/ws/rooms");
const prisma_client_1 = require("../infra/db/prisma.client"); // Import indispensable pour lister les villages
const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};
const economyService = new economy_service_1.EconomyService();
exports.resourceTickWorker = new bullmq_1.Worker('resource-tick', async (job) => {
    // Si c'est un tick global, on récupère tous les IDs de villages en BDD
    if (job.name === 'global-resource-tick') {
        const villages = await prisma_client_1.prisma.village.findMany({ select: { id: true } });
        console.log(`[Worker] ⚙️ Processing tick for ${villages.length} villages`);
        for (const v of villages) {
            try {
                const updated = await economyService.processVillageTick(v.id);
                if (updated) {
                    (0, rooms_1.broadcastDelta)(v.id, {
                        wood: Math.floor(updated.wood),
                        stone: Math.floor(updated.stone),
                        iron: Math.floor(updated.iron),
                    });
                }
            }
            catch (err) {
                console.error(`[Worker] ❌ Failed to tick village ${v.id}:`, err);
            }
        }
    }
}, { connection: redisConnection });
