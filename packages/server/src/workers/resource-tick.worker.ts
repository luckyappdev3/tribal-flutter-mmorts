import { Worker } from 'bullmq';
import { EconomyService } from '../modules/economy/economy.service';
import { broadcastDelta } from '../infra/ws/rooms';
import { prisma } from '../infra/db/prisma.client'; // Import indispensable pour lister les villages

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const economyService = new EconomyService();

export const resourceTickWorker = new Worker(
  'resource-tick',
  async (job) => {
    // Si c'est un tick global, on récupère tous les IDs de villages en BDD
    if (job.name === 'global-resource-tick') {
      const villages = await prisma.village.findMany({ select: { id: true } });
      
      console.log(`[Worker] ⚙️ Processing tick for ${villages.length} villages`);

      for (const v of villages) {
        try {
          const updated = await economyService.processVillageTick(v.id);
          if (updated) {
            broadcastDelta(v.id, {
              wood: Math.floor(updated.wood),
              stone: Math.floor(updated.stone),
              iron: Math.floor(updated.iron),
            });
          }
        } catch (err) {
          console.error(`[Worker] ❌ Failed to tick village ${v.id}:`, err);
        }
      }
    }
  },
  { connection: redisConnection }
);