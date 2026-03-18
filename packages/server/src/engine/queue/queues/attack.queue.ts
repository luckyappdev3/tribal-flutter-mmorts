import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface AttackJobData {
  attackerVillageId: string;
  defenderVillageId: string;
  units:             Record<string, number>;
  activeAttackId:    string;
}

export class AttackQueue {
  private queue: Queue;

  constructor() {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue('attacks', { connection });
  }

  async addJob(data: AttackJobData, delayMs: number) {
    return await this.queue.add('resolve-attack', data, {
      delay:            delayMs,
      removeOnComplete: true,
      attempts:         3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
