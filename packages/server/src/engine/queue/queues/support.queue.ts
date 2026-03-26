import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface SupportJobData {
  supportId:     string;
  fromVillageId: string;
  toVillageId:   string;
  units:         Record<string, number>;
  returning?:    boolean;
  travelMs?:     number;
}

export class SupportQueue {
  private queue: Queue;

  constructor() {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue('supports', { connection });
  }

  async addJob(data: SupportJobData, delayMs: number) {
    return await this.queue.add('resolve-support', data, {
      delay:            delayMs,
      removeOnComplete: true,
      attempts:         1,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
