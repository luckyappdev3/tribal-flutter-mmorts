import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { SupportJobData } from '../engine/queue/queues/support.queue';
import { io } from '../infra/ws/socket.server';

function safeEmit(room: string, event: string, data: any) {
  try {
    if (!io) return;
    io.to(room).emit(event, data);
  } catch { /* ignore */ }
}

export function createSupportWorker(fastify: FastifyInstance): Worker {
  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  return new Worker('supports', async (job: Job<SupportJobData>) => {
    const { supportId, fromVillageId, toVillageId, units, returning, travelMs } = job.data;

    // ── Retour : les troupes rentrent au village d'origine ─────
    if (returning) {
      await fastify.prisma.$transaction(async (tx: any) => {
        for (const [unitType, count] of Object.entries(units)) {
          if (count <= 0) continue;
          await tx.troop.upsert({
            where:  { villageId_unitType: { villageId: fromVillageId, unitType } },
            update: { count: { increment: count } },
            create: { villageId: fromVillageId, unitType, count },
          });
        }
        try { await tx.activeSupport.delete({ where: { id: supportId } }); }
        catch { /* déjà supprimé */ }
      });

      safeEmit(`village:${fromVillageId}`, 'support:returned', {
        units,
        message: 'Vos troupes de renfort sont rentrées à la base !',
      });
      return;
    }

    // ── Arrivée : le support devient stationné ──────────────────
    const support = await fastify.prisma.activeSupport.findUnique({
      where: { id: supportId },
    });
    if (!support) {
      console.warn(`⚠️ Support ${supportId} introuvable`);
      return;
    }

    await fastify.prisma.activeSupport.update({
      where: { id: supportId },
      data:  { status: 'stationed' },
    });

    const fromVillage = await fastify.prisma.village.findUnique({
      where:  { id: fromVillageId },
      select: { name: true },
    });

    safeEmit(`village:${toVillageId}`, 'support:arrived', {
      units,
      fromVillageName: fromVillage?.name ?? '?',
      message: `Renfort de ${fromVillage?.name ?? '?'} arrivé !`,
    });
    safeEmit(`village:${fromVillageId}`, 'support:stationed', {
      toVillageId,
      message: 'Vos renforts sont arrivés à destination.',
    });

    console.log(`🛡️ Support ${supportId} stationné : ${JSON.stringify(units)} → ${toVillageId}`);
  }, { connection });
}
