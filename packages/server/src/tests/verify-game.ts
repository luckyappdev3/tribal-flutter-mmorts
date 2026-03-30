import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    // Récupérer la dernière game créée
    const game = await prisma.game.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        villages: {
          select: {
            id: true,
            name: true,
            x: true,
            y: true,
            isBot: true,
            playerId: true,
          },
        },
      },
    });

    if (!game) {
      console.log('❌ Aucune game trouvée');
      return;
    }

    console.log('\n📊 GAME DETAILS:');
    console.log(`  Game ID: ${game.id}`);
    console.log(`  Status: ${game.status}`);
    console.log(`  Bot Count: ${game.botCount}`);
    console.log(`  Bot Level: ${game.botLevel}`);
    console.log(`  Game Speed: ×${game.gameSpeed}`);
    console.log(`  Created: ${game.createdAt}`);

    console.log('\n🏘️  VILLAGES IN GAME:');
    for (const v of game.villages) {
      const marker = v.isBot ? '🤖' : '👤';
      console.log(`  ${marker} ${v.name} (${v.x}, ${v.y})`);
    }

    console.log(`\n✅ Total villages: ${game.villages.length} (expected: ${1 + game.botCount})`);

    if (game.villages.length === 1 + game.botCount) {
      console.log('✅ Nombre de villages correct!');
    } else {
      console.log('⚠️  Nombre de villages incorrect!');
    }

    // Vérifier que les bots ont le gameId
    const bots = await prisma.village.findMany({
      where: { gameId: game.id, isBot: true },
      select: {
        id: true,
        name: true,
        botDifficulty: true,
        botPlayerId: true,
      },
    });

    console.log(`\n🤖 BOT DETAILS (${bots.length} bots):`);
    for (const bot of bots) {
      console.log(`  ${bot.name}`);
      console.log(`    - Difficulty: ${bot.botDifficulty}`);
      console.log(`    - Player ID: ${bot.botPlayerId?.slice(-6)}`);
    }

    console.log('\n✅ VERIFICATION COMPLETE');

  } finally {
    await prisma.$disconnect();
  }
}

verify();
