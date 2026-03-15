import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// On définit l'interface du job pour avoir un typage strict
export interface BuildJobData {
  villageId: string;
  buildingId: string;
  targetLevel: number;
}

export class BuildingQueue {
  private queue: Queue;

  constructor() {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue('builds', { connection });
  }

  /**
   * Ajoute un job de construction avec un délai (le temps de construction)
   */
  async addJob(data: BuildJobData, delayMs: number) {
    return await this.queue.add('finish-build', data, {
      delay: delayMs,
      removeOnComplete: true, // Nettoie Redis après succès
      attempts: 3,            // Réessaie en cas de crash du worker
      backoff: { type: 'exponential', delay: 1000 }
    });
  }
}