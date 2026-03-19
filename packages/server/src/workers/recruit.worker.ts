// packages/server/src/workers/recruit.worker.ts
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

      await fastify.prisma.$transaction(async (tx: any) => {
        // 1. Incrémenter le stock de troupes
        await tx.troop.upsert({
          where:  { villageId_unitType: { villageId, unitType } },
          update: { count: { increment: count } },
          create: { villageId, unitType, count },
        });

        // 2. Supprimer la file — deleteMany évite l'erreur si déjà supprimée
        await tx.recruitQueue.deleteMany({ where: { villageId } });
      });

      console.log(`✅ ${count}× ${unitType} ajoutés au village ${villageId}`);

      // Socket — non bloquant
      try {
        fastify.io.to(`village:${villageId}`).emit('troops:ready', {
          unitType,
          count,
          message: `${count} ${unitType}(s) sont prêts au combat !`,
        });
      } catch (e) {
        console.warn('⚠️ Socket emit recrutement échoué (non bloquant)');
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job recrutement ${job?.id} échoué : ${err.message}`);
  });

  return worker;
}