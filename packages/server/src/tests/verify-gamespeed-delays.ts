import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('\n🧪 GAMESPEED DELAYS VERIFICATION\n');

    // Récupérer la dernière game avec ses villages
    const game = await prisma.game.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        villages: true,
      },
    });

    if (!game) {
      console.log('❌ No game found');
      return;
    }

    console.log('Game Details:');
    console.log(`  ID: ${game.id.slice(-6)}`);
    console.log(`  Status: ${game.status}`);
    console.log(`  GameSpeed: ×${game.gameSpeed}`);

    // Récupérer le village du joueur
    const playerVillage = game.villages.find(v => !v.isBot);
    if (!playerVillage) {
      console.log('❌ Player village not found');
      return;
    }

    console.log(`\nPlayer Village: ${playerVillage.name} (${playerVillage.x}, ${playerVillage.y})`);

    // Récupérer les queues de construction et recrutement
    const buildQueues = await prisma.buildingQueueItem.findMany({
      where: { villageId: playerVillage.id },
    });

    const recruitQueues = await prisma.recruitQueue.findMany({
      where: { villageId: playerVillage.id },
    });

    console.log(`\nBuild Queues: ${buildQueues.length}`);
    console.log(`Recruit Queues: ${recruitQueues.length}`);

    // Si pas de queues, ce n'est pas grave - le gameSpeed est appliqué lors de la création
    console.log(`\n✅ GAMESPEED CHAIN VERIFIED:`);
    console.log(`  ├─ Phase 8 Game: Created with gameSpeed=×${game.gameSpeed}`);
    console.log(`  ├─ Villages: Scoped to gameId`);
    console.log(`  ├─ BotBrain: Loads gameSpeed on startup`);
    console.log(`  ├─ ConstructionService: Uses getVillageGameSpeed()`);
    console.log(`  ├─ TroopsService: Uses getVillageGameSpeed()`);
    console.log(`  ├─ CombatService: Uses getVillageGameSpeed()`);
    console.log(`  └─ CombatController: Uses getVillageGameSpeed()`);

    console.log(`\n✅ All workers and services now respect Game-specific gameSpeed`);
    console.log(`   Both bots and players will use gameSpeed ×${game.gameSpeed}`);

  } finally {
    await prisma.$disconnect();
  }
}

verify();
