import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { BuildJobData } from '../engine/queue/queues/build.queue';

// ─────────────────────────────────────────────────────────────
//  Build Worker — Phase 1 patch
//  Passe de BuildingQueue (unique) à BuildingQueueItem (multi-slots).
//  Quand un job se termine :
//    1. Met à jour le niveau du bâtiment
//    2. Supprime l'item position=0
//    3. Si un item position=1 existe, planifie son job BullMQ
// ─────────────────────────────────────────────────────────────

export function initBuildWorker(fastify: FastifyInstance) {
  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<BuildJobData>(
    'builds',
    async (job: Job<BuildJobData>) => {
      const { villageId, buildingId, targetLevel } = job.data;

      console.log(`🏗️  Fin de construction : ${buildingId} Niv.${targetLevel} → village ${villageId}`);

      try {
        // ── Trouver l'item en cours (position 0) ────────────────
        const currentItem = await fastify.prisma.buildingQueueItem.findFirst({
          where:   { villageId, buildingId, targetLevel, position: 0 },
          orderBy: { startsAt: 'asc' },
        });

        await fastify.prisma.$transaction(async (tx) => {
          // 1. Mettre à jour le niveau du bâtiment
          await tx.buildingInstance.upsert({
            where:  { villageId_buildingId: { villageId, buildingId } },
            update: { level: targetLevel },
            create: { villageId, buildingId, level: targetLevel },
          });

          // 2. Supprimer l'item terminé
          if (currentItem) {
            await tx.buildingQueueItem.delete({ where: { id: currentItem.id } });
          }

          // 3. Réindexer les items restants (décaler position −1)
          await tx.$executeRaw`
            UPDATE "BuildingQueueItem"
            SET position = position - 1
            WHERE "villageId" = ${villageId}
              AND position > 0
          `;
        });

        // ── Planifier le prochain item dans BullMQ ──────────────
        const nextItem = await fastify.prisma.buildingQueueItem.findFirst({
          where:   { villageId, position: 0 },
          orderBy: { startsAt: 'asc' },
        });

        if (nextItem) {
          const delay = Math.max(0, nextItem.endsAt.getTime() - Date.now());
          // Accéder à buildQueue via fastify — à déclarer dans main.ts si absent
          const buildQueue = (fastify as any).buildQueue;
          if (buildQueue) {
            await buildQueue.addJob(
              { villageId, buildingId: nextItem.buildingId, targetLevel: nextItem.targetLevel },
              delay,
            );
            console.log(`📋 Prochain bâtiment planifié : ${nextItem.buildingId} Niv.${nextItem.targetLevel} dans ${Math.round(delay / 1000)}s`);
          }
        }

        console.log(`✅ ${buildingId} Niv.${targetLevel} terminé !`);

        fastify.io.to(`village:${villageId}`).emit('build:finished', {
          buildingId,
          level:   targetLevel,
          message: `${buildingId} est maintenant niveau ${targetLevel} !`,
        });

      } catch (error) {
        console.error(`❌ Erreur finalisation bâtiment :`, error);
        throw error;
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job build ${job?.id} échoué : ${err.message}`);
  });

  return worker;
}
