import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { RecruitJobData, RecruitQueue } from '../engine/queue/queues/recruit.queue';
import { GameDataRegistry } from '../engine/game-data-registry';
import { io } from '../infra/ws/socket.server';

// ── Formule partagée avec TroopsService ─────────────────────
function calcRecruitTimeMs(baseTimeSec: number, buildingLevel: number, gameSpeed: number): number {
  const T_real = baseTimeSec * Math.pow(0.94, Math.max(0, buildingLevel - 1));
  return Math.max(1000, Math.floor(T_real * 1000 / gameSpeed));
}

export function initRecruitWorker(
  fastify:  FastifyInstance,
  gameData: GameDataRegistry,
  recruitQ: RecruitQueue,
) {
  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<RecruitJobData>(
    'recruits',
    async (job: Job<RecruitJobData>) => {
      const { villageId, unitType, queueId, buildingType } = job.data;

      // 1. Récupérer l'entrée de file
      const entry = await fastify.prisma.recruitQueue.findUnique({ where: { id: queueId } });
      if (!entry) {
        console.warn(`⚠️  Queue entry ${queueId} introuvable — job ignoré`);
        return;
      }

      const newTrained = entry.trainedCount + 1;

      // 2. Ajouter 1 unité + mettre à jour trainedCount (ou supprimer si lot fini)
      await fastify.prisma.$transaction(async (tx: any) => {
        await tx.troop.upsert({
          where:  { villageId_unitType: { villageId, unitType } },
          update: { count: { increment: 1 } },
          create: { villageId, unitType, count: 1 },
        });

        if (newTrained < entry.totalCount) {
          await tx.recruitQueue.update({
            where: { id: queueId },
            data:  { trainedCount: newTrained },
          });
        } else {
          await tx.recruitQueue.delete({ where: { id: queueId } });
        }
      });

      console.log(`⚔️  Unité libérée : ${unitType} (${newTrained}/${entry.totalCount}) → village ${villageId}`);

      // 3. Événement WebSocket par unité libérée
      try {
        if (io) io.to(`village:${villageId}`).emit('troops:unit_ready', {
          unitType,
          trainedCount: newTrained,
          totalCount:   entry.totalCount,
          buildingType,
        });
      } catch {
        console.warn('⚠️ Socket emit recrutement échoué (non bloquant)');
      }

      // 4. Planifier la prochaine unité
      const getSpeedData = async () => {
        const [building, village] = await Promise.all([
          fastify.prisma.buildingInstance.findUnique({
            where: { villageId_buildingId: { villageId, buildingId: buildingType } },
          }),
          fastify.prisma.village.findUnique({
            where: { id: villageId }, include: { world: { select: { gameSpeed: true } } },
          }),
        ]);
        return {
          buildingLevel: building?.level ?? 1,
          gameSpeed:     (village as any)?.world?.gameSpeed ?? 1.0,
        };
      };

      if (newTrained < entry.totalCount) {
        // Même lot — unité suivante avec temps recalculé
        const { buildingLevel, gameSpeed } = await getSpeedData();
        const unitDef   = gameData.getUnitDef(unitType);
        const nextMs    = calcRecruitTimeMs(unitDef.recruitTime, buildingLevel, gameSpeed);
        const nextUnitAt = new Date(Date.now() + nextMs);

        await fastify.prisma.recruitQueue.update({
          where: { id: queueId },
          data:  { nextUnitAt },
        });
        await recruitQ.addJob(
          { villageId, unitType, count: entry.totalCount, queueId, buildingType },
          nextMs,
        );

      } else {
        // Lot terminé — chercher le prochain lot dans la même file de bâtiment
        const nextEntry = await fastify.prisma.recruitQueue.findFirst({
          where:   { villageId, buildingType },
          orderBy: { startsAt: 'asc' },
        });

        if (nextEntry) {
          const { buildingLevel, gameSpeed } = await getSpeedData();
          const nextUnitDef = gameData.getUnitDef(nextEntry.unitType);
          const nextMs      = calcRecruitTimeMs(nextUnitDef.recruitTime, buildingLevel, gameSpeed);
          const nextUnitAt  = new Date(Date.now() + nextMs);

          await fastify.prisma.recruitQueue.update({
            where: { id: nextEntry.id },
            data:  { nextUnitAt },
          });
          await recruitQ.addJob(
            {
              villageId,
              unitType:    nextEntry.unitType,
              count:       nextEntry.totalCount,
              queueId:     nextEntry.id,
              buildingType,
            },
            nextMs,
          );
        }
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job recrutement ${job?.id} échoué : ${err.message}`);
  });

  return worker;
}
