import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { BuildJobData } from '../engine/queue/queues/build.queue';

/**
 * On exporte une fonction d'initialisation qui reçoit l'instance Fastify
 */
export function initBuildWorker(fastify: FastifyInstance) {
  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<BuildJobData>(
    'builds',
    async (job: Job<BuildJobData>) => {
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

      } catch (error) {
        console.error(`❌ Erreur lors de la finalisation du bâtiment :`, error);
        throw error;
      }
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job ${job?.id} a échoué : ${err.message}`);
  });

  return worker;
}