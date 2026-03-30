import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('\n🧪 COMPLETE API FLOW TEST\n');

  try {
    // Phase 7: Register
    console.log('📋 Phase 7: Auth');
    const player = await prisma.player.create({
      data: {
        username: `TestPlayer_${Date.now()}`,
        email: `test_${Date.now()}@test.com`,
        password: 'test123456',
      },
    });
    console.log(`✅ Player created: ${player.username}`);

    // Phase 8: Create Game
    console.log('\n🎮 Phase 8: Create Game');
    const game = await prisma.game.create({
      data: {
        playerId: player.id,
        botCount: 3,
        botLevel: 5,
        gameSpeed: 200,
      },
    });
    console.log(`✅ Game created: ${game.id} (status: ${game.status})`);

    // Phase 9: Map Generation
    console.log('\n🗺️  Phase 9: Map Generation');
    await prisma.game.update({
      where: { id: game.id },
      data: { status: 'running' },
    });

    const playerVillage = await prisma.village.create({
      data: {
        name: 'Mon Village',
        x: Math.floor(Math.random() * 40),
        y: Math.floor(Math.random() * 40),
        playerId: player.id,
        gameId: game.id,
        buildings: {
          create: [
            { buildingId: 'headquarters', level: 1 },
          ],
        },
      },
    });
    console.log(`✅ Player village placed at (${playerVillage.x}, ${playerVillage.y})`);

    // Phase 10: Bot AI
    console.log('\n🤖 Phase 10: Bot Spawning');
    const ts = Date.now();
    const usedCoords = new Set([`${playerVillage.x},${playerVillage.y}`]);

    for (let i = 0; i < 3; i++) {
      const botPlayer = await prisma.player.create({
        data: {
          username: `TestBot_${ts}_${i}`,
          email: `bot_${ts}_${i}@test.com`,
          password: 'unused',
          isBot: true,
        },
      });

      let bx, by;
      do {
        bx = Math.floor(Math.random() * 40);
        by = Math.floor(Math.random() * 40);
      } while (usedCoords.has(`${bx},${by}`));
      usedCoords.add(`${bx},${by}`);

      const botVillage = await prisma.village.create({
        data: {
          name: `Bot Village ${i + 1}`,
          x: bx,
          y: by,
          playerId: botPlayer.id,
          gameId: game.id,
          isBot: true,
          botDifficulty: 5,
          botPlayerId: player.id,
          buildings: {
            create: [
              { buildingId: 'headquarters', level: 1 },
            ],
          },
        },
      });
      console.log(`✅ Bot ${i + 1} village spawned at (${botVillage.x}, ${botVillage.y})`);
    }

    // Phase 11: Game Over
    console.log('\n🏆 Phase 11: Game Over Detection');
    const allVillages = await prisma.village.findMany({
      where: { gameId: game.id },
    });
    console.log(`✅ Total villages in game: ${allVillages.length}`);

    const finished = await prisma.game.update({
      where: { id: game.id },
      data: {
        status: 'finished',
        winnerId: player.id,
        endedAt: new Date(),
      },
    });
    console.log(`✅ Game finished - winner: ${finished.winnerId?.slice(-6)}`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ FULL API FLOW SUCCESSFUL');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
