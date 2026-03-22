import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { BuildJobData } from '../engine/queue/queues/build.queue';
import { calculateVillagePoints } from '@mmorts/shared';

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
        const currentItem = await fastify.prisma.buildingQueueItem.findFirst({
          where:   { villageId, buildingId, targetLevel, position: 0 },
          orderBy: { startsAt: 'asc' },
        });

        await fastify.prisma.$transaction(async (tx) => {
          await tx.buildingInstance.upsert({
            where:  { villageId_buildingId: { villageId, buildingId } },
            update: { level: targetLevel },
            create: { villageId, buildingId, level: targetLevel },
          });

          if (currentItem) {
            await tx.buildingQueueItem.delete({ where: { id: currentItem.id } });
          }

          await tx.$executeRaw`
            UPDATE "BuildingQueueItem"
            SET position = position - 1
            WHERE "villageId" = ${villageId}
              AND position > 0
          `;
        });

        // ── Recalculer les points du joueur (basé sur bâtiments) ──
        const village = await fastify.prisma.village.findUnique({
          where:   { id: villageId },
          include: { buildings: true },
        }) as any;

        if (village?.playerId) {
          const newPoints = calculateVillagePoints(
            village.buildings as { buildingId: string; level: number }[],
            (id: string) => {
              try { return fastify.gameData.getBuildingDef(id); }
              catch { return null; }
            },
          );

          await fastify.prisma.player.update({
            where: { id: village.playerId },
            data:  { totalPoints: newPoints },
          });

          console.log(`📊 Points joueur mis à jour → ${newPoints} pts`);
        }

        // ── Planifier le prochain item ─────────────────────────────
        const nextItem = await fastify.prisma.buildingQueueItem.findFirst({
          where:   { villageId, position: 0 },
          orderBy: { startsAt: 'asc' },
        });

        if (nextItem) {
          const delay      = Math.max(0, nextItem.endsAt.getTime() - Date.now());
          const buildQueue = (fastify as any).buildQueue;
          if (buildQueue) {
            await buildQueue.addJob(
              { villageId, buildingId: nextItem.buildingId, targetLevel: nextItem.targetLevel },
              delay,
            );
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
