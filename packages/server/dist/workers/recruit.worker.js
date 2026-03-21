"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRecruitWorker = initRecruitWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const socket_server_1 = require("../infra/ws/socket.server");
function initRecruitWorker(fastify) {
    const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
    });
    const worker = new bullmq_1.Worker('recruits', async (job) => {
        const { villageId, unitType, count } = job.data;
        console.log(`⚔️  Recrutement terminé : ${count}× ${unitType} pour le village ${villageId}`);
        await fastify.prisma.$transaction(async (tx) => {
            await tx.troop.upsert({
                where: { villageId_unitType: { villageId, unitType } },
                update: { count: { increment: count } },
                create: { villageId, unitType, count },
            });
            await tx.recruitQueue.deleteMany({ where: { villageId } });
        });
        console.log(`✅ ${count}× ${unitType} ajoutés au village ${villageId}`);
        try {
            if (socket_server_1.io)
                socket_server_1.io.to(`village:${villageId}`).emit('troops:ready', {
                    unitType,
                    count,
                    message: `${count} ${unitType}(s) sont prêts au combat !`,
                });
        }
        catch (e) {
            console.warn('⚠️ Socket emit recrutement échoué (non bloquant)');
        }
    }, { connection });
    worker.on('failed', (job, err) => {
        console.error(`🚨 Job recrutement ${job?.id} échoué : ${err.message}`);
    });
    return worker;
}
