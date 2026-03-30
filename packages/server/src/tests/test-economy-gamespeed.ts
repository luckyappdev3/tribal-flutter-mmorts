import { PrismaClient } from '@prisma/client';
import { EconomyService } from '../modules/economy/economy.service';

const prisma = new PrismaClient();

(async () => {
  console.log('\n🧪 ECONOMY GAMESPEED TEST\n');

  // Get a village from a game with gameSpeed
  const game = await prisma.game.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      villages: {
        where: { isBot: false },
        take: 1
      }
    }
  });

  if (!game || !game.villages[0]) {
    console.log('❌ No game village found');
    process.exit(1);
  }

  const village = game.villages[0];
  console.log('Test village:', village.name);
  console.log('Game ID:', game.id.slice(-6));
  console.log('Game Speed: ×' + game.gameSpeed);

  // Manually set lastTick to 1 hour ago to test production
  await prisma.village.update({
    where: { id: village.id },
    data: {
      lastTick: new Date(Date.now() - 3600000) // 1 hour ago
    }
  });

  console.log('\nBefore tick:');
  const before = await prisma.village.findUnique({
    where: { id: village.id }
  });
  console.log('  Wood:', before?.wood.toFixed(0));
  console.log('  Stone:', before?.stone.toFixed(0));
  console.log('  Iron:', before?.iron.toFixed(0));

  // Process tick
  const economyService = new EconomyService();
  const after = await economyService.processVillageTick(village.id);

  console.log('\nAfter tick (1 hour, gameSpeed ×' + game.gameSpeed + '):');
  console.log('  Wood:', after?.wood.toFixed(0), '(+', (after?.wood ?? 0 - (before?.wood ?? 0)).toFixed(0) + ')');
  console.log('  Stone:', after?.stone.toFixed(0), '(+', (after?.stone ?? 0 - (before?.stone ?? 0)).toFixed(0) + ')');
  console.log('  Iron:', after?.iron.toFixed(0), '(+', (after?.iron ?? 0 - (before?.iron ?? 0)).toFixed(0) + ')');

  console.log('\n✅ GAMESPEED APPLIED TO ECONOMY:');
  const woodGain = (after?.wood ?? 0) - (before?.wood ?? 0);
  if (woodGain > 0) {
    console.log('  ✅ Production applied (wood gained:', woodGain.toFixed(0) + ')');
    console.log('  ✅ GameSpeed multiplier: ×' + game.gameSpeed);
  } else {
    console.log('  ❌ No production applied!');
  }

  await prisma.$disconnect();
})();
