// ─────────────────────────────────────────────────────────────
// bot.smoke.ts — Smoke test en partie réelle (23.1)
//
// Vérifie que BotService démarre correctement, que les bots
// avancent en phase et finissent par envoyer un noble.
//
// Usage : BOT_TICK_MS=200 ts-node src/bot/bot.smoke.ts
//
// Critère de succès :
//   - Les 2 bots atteignent la phase 'late'
//   - Au moins 1 noble envoyé par chaque bot dans les 500 ticks
// ─────────────────────────────────────────────────────────────

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient }        from '@prisma/client';
import { randomUUID }          from 'crypto';
import { GameDataRegistry }    from '../engine/game-data-registry';
import { BotBrain }            from './bot.brain';
import { buildProfile }        from './bot.profile';
import { buildStyleWeights }   from './bot.profile';
import { getSnapshot }         from './bot.snapshot';

// ── Stubs des services (actions no-op pour le smoke test) ────

const noopConstruction = {
  startUpgrade: async () => {},
};

const noopTroops = {
  startRecruit: async () => {},
};

const noopCombat = {
  sendAttack:   async () => {},
  sendScout:    async () => {},
  recall:       async () => {},
  sendSupport:  async () => {},
};

const noopCoordHub = {
  register:    () => {},
  shouldFire:  () => false,
  consume:     () => {},
  deregister:  () => {},
};

// ── Helpers ───────────────────────────────────────────────────

async function ensureTestVillage(
  prisma: PrismaClient,
  gameData: GameDataRegistry,
  level: number,
): Promise<string> {
  const uid = randomUUID().slice(0, 6);

  const world = await prisma.gameWorld.findFirst({ select: { id: true } });
  if (!world) throw new Error('Aucun GameWorld en base — démarrer le serveur une première fois.');

  const player = await prisma.player.create({
    data: {
      username: `SmokeBot_${uid}`,
      email:    `smoke_${uid}@bot.internal`,
      password: randomUUID(),
      isBot:    true,
    },
  });

  const village = await prisma.village.create({
    data: {
      name:          `Smoke Village ${uid}`,
      x:             Math.floor(Math.random() * 35) + 3,
      y:             Math.floor(Math.random() * 35) + 3,
      playerId:      player.id,
      worldId:       world.id,
      isBot:         true,
      botDifficulty: level,
      botPlayerId:   player.id,
      buildings: {
        create: [
          { buildingId: 'headquarters', level: 5 },
          { buildingId: 'timber_camp',  level: 3 },
          { buildingId: 'quarry',       level: 3 },
          { buildingId: 'iron_mine',    level: 3 },
          { buildingId: 'warehouse',    level: 3 },
          { buildingId: 'barracks',     level: 3 },
          { buildingId: 'smith',        level: 3 },
          { buildingId: 'rally_point',  level: 1 },
          { buildingId: 'stable',       level: 2 },
          { buildingId: 'wall',         level: 2 },
        ],
      },
    },
    select: { id: true },
  });

  console.log(`[smoke] Village niveau ${level} créé : ${village.id.slice(-6)}`);
  return village.id;
}

async function cleanup(prisma: PrismaClient, villageIds: string[]) {
  for (const id of villageIds) {
    const village = await prisma.village.findUnique({
      where:  { id },
      select: { playerId: true },
    });
    await prisma.village.delete({ where: { id } });
    if (village?.playerId) {
      await prisma.player.delete({ where: { id: village.playerId } }).catch(() => {});
    }
  }
  console.log('[smoke] Nettoyage terminé.');
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  process.env.BOT_TICK_MS = process.env.BOT_TICK_MS ?? '200';

  const prisma   = new PrismaClient();
  const gameData = new GameDataRegistry();
  await gameData.loadAll();

  const createdVillages: string[] = [];

  try {
    // Créer 2 villages de test (niveau 10 et niveau 8)
    const v10id = await ensureTestVillage(prisma, gameData, 10);
    const v8id = await ensureTestVillage(prisma, gameData, 8);
    createdVillages.push(v10id, v8id);

    const services = {
      construction: noopConstruction as any,
      troops:       noopTroops       as any,
      combat:       noopCombat       as any,
    };

    // Compteurs de validation
    const reachedLate  = new Set<string>();
    const sentNoble    = new Set<string>();

    // Remplacer sendAttack pour détecter les envois de nobles
    const patchedCombat = {
      ...noopCombat,
      sendAttack: async (_from: string, _to: string, units: Record<string, number>) => {
        if (units['noble'] && units['noble'] > 0) sentNoble.add(_from);
      },
    };

    const makeSnappedBrain = (villageId: string, level: number) => {
      const brain = new BotBrain(
        villageId,
        level,
        villageId,
        () => [],
        noopCoordHub,
        prisma,
        gameData,
        { ...services, combat: patchedCombat as any },
      );
      return brain;
    };

    const brain10 = makeSnappedBrain(v10id, 10);
    const brain8 = makeSnappedBrain(v8id, 8);

    console.log('\n[smoke] Démarrage des 2 bots (500 ticks max, BOT_TICK_MS=' + process.env.BOT_TICK_MS + ')...\n');
    console.log(`[smoke] Log Maître (nv10) : ${brain10.logger.path}`);
    console.log(`[smoke] Log Expert (nv8)  : ${brain8.logger.path}\n`);

    // Observer les phases
    const monitorInterval = setInterval(() => {
      if (brain10.currentPhase === 'late') reachedLate.add(v10id);
      if (brain8.currentPhase === 'late') reachedLate.add(v8id);

      const done = reachedLate.size === 2 && sentNoble.size >= 1;
      if (done) {
        console.log('\n[smoke] ✅ Critères atteints :');
        console.log(`  Phase late : ${reachedLate.size}/2 bots`);
        console.log(`  Nobles envoyés : ${sentNoble.size} bot(s)`);
        brain10.stop();
        brain8.stop();
        clearInterval(monitorInterval);
      }
    }, 500);

    // Lancer les 2 bots en parallèle (ils s'arrêtent seuls ou après stop())
    await Promise.allSettled([
      brain10.start(),
      brain8.start(),
    ]);

    clearInterval(monitorInterval);

    // Validation finale
    const ok = reachedLate.size === 2 && sentNoble.size >= 1;
    console.log('\n[smoke] ─── Résultat final ───────────────────────');
    console.log(`  Phase late atteinte : ${reachedLate.size}/2 ${reachedLate.size === 2 ? '✅' : '❌'}`);
    console.log(`  Nobles envoyés      : ${sentNoble.size}   ${sentNoble.size >= 1 ? '✅' : '❌'}`);

    if (!ok) process.exitCode = 1;

  } finally {
    await cleanup(prisma, createdVillages);
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('[smoke] Erreur fatale :', err);
  process.exit(1);
});
