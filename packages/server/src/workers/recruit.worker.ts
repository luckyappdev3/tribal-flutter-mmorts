import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { RecruitJobData } from '../engine/queue/queues/recruit.queue';

export function initRecruitWorker(fastify: FastifyInstance) {
  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<RecruitJobData>(
    'recruits',
    async (job: Job<RecruitJobData>) => {
      const { villageId, unitType, count } = job.data;

      console.log(`⚔️  Recrutement terminé : ${count}× ${unitType} pour le village ${villageId}`);

      try {
        await fastify.prisma.$transaction(async (tx) => {
          // 1. Incrémenter le stock de troupes (upsert)
          await tx.troop.upsert({
            where:  { villageId_unitType: { villageId, unitType } },
            update: { count: { increment: count } },
            create: { villageId, unitType, count },
          });

          // 2. Supprimer la file de recrutement
          await tx.recruitQueue.delete({ where: { villageId } });
        });

        console.log(`✅ ${count}× ${unitType} ajoutés au village ${villageId}`);

        // 3. Notifier le joueur en temps réel
        fastify.io.to(`village:${villageId}`).emit('troops:ready', {
          unitType,
          count,
          message: `${count} ${unitType}(s) sont prêts au combat !`,
        });

      } catch (error) {
        console.error(`❌ Erreur recrutement pour village ${villageId}:`, error);
        throw error;
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job recrutement ${job?.id} échoué : ${err.message}`);
  });

  return worker;
}
