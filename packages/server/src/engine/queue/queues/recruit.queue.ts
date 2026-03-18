import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface RecruitJobData {
  villageId: string;
  unitType:  string;
  count:     number;
}

export class RecruitQueue {
  private queue: Queue;

  constructor() {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue('recruits', { connection });
  }

  async addJob(data: RecruitJobData, delayMs: number) {
    return await this.queue.add('finish-recruit', data, {
      delay:           delayMs,
      removeOnComplete: true,
      attempts:         3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
