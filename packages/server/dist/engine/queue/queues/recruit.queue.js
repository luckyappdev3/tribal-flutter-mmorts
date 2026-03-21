"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruitQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
class RecruitQueue {
    queue;
    constructor() {
        const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null,
        });
        this.queue = new bullmq_1.Queue('recruits', { connection });
    }
    async addJob(data, delayMs) {
        return await this.queue.add('finish-recruit', data, {
            delay: delayMs,
            removeOnComplete: true,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
        });
    }
}
exports.RecruitQueue = RecruitQueue;
