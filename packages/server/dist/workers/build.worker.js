"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBuildWorker = initBuildWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * On exporte une fonction d'initialisation qui reçoit l'instance Fastify
 */
function initBuildWorker(fastify) {
    const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
    });
    const worker = new bullmq_1.Worker('builds', async (job) => {
        const { villageId, buildingId, targetLevel } = job.data;
        console.log(`🏗️  Fin de construction pour ${buildingId} (Niv ${targetLevel}) dans le village ${villageId}`);
        try {
            // Utilisation du prisma de fastify
            await fastify.prisma.$transaction(async (tx) => {
                // 1. Mettre à jour ou créer l'instance du bâtiment
                await tx.buildingInstance.upsert({
                    where: {
                        villageId_buildingId: { villageId, buildingId }
                    },
                    update: { level: targetLevel },
                    create: {
                        villageId,
                        buildingId,
                        level: targetLevel
                    },
                });
                // 2. Supprimer l'entrée de la file d'attente en BDD
                await tx.buildingQueue.delete({
                    where: { villageId }
                });
            });
            console.log(`✅ Amélioration terminée avec succès !`);
            // --- NOTIFICATION TEMPS RÉEL ---
            // On envoie un message à la "room" du village
            fastify.io.to(`village:${villageId}`).emit('build:finished', {
                buildingId,
                level: targetLevel,
                message: `Votre ${buildingId} est maintenant niveau ${targetLevel} !`
            });
        }
        catch (error) {
            console.error(`❌ Erreur lors de la finalisation du bâtiment :`, error);
            throw error;
        }
    }, { connection });
    worker.on('failed', (job, err) => {
        console.error(`🚨 Job ${job?.id} a échoué : ${err.message}`);
    });
    return worker;
}
