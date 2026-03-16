"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
class BuildingQueue {
    queue;
    constructor() {
        const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null,
        });
        this.queue = new bullmq_1.Queue('builds', { connection });
    }
    /**
     * Ajoute un job de construction avec un délai (le temps de construction)
     */
    async addJob(data, delayMs) {
        return await this.queue.add('finish-build', data, {
            delay: delayMs,
            removeOnComplete: true, // Nettoie Redis après succès
            attempts: 3, // Réessaie en cas de crash du worker
            backoff: { type: 'exponential', delay: 1000 }
        });
    }
}
exports.BuildingQueue = BuildingQueue;
