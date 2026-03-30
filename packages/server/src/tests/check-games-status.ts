import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const games = await prisma.game.findMany({
    select: { id: true, status: true, botCount: true, gameSpeed: true }
  });

  const statuses: Record<string, any[]> = {};
  games.forEach(g => {
    if (!statuses[g.status]) statuses[g.status] = [];
    statuses[g.status].push(g);
  });

  console.log('Games by status:');
  for (const [status, gs] of Object.entries(statuses)) {
    console.log('\n' + status.toUpperCase() + ':');
    gs.forEach((g: any) => console.log('  -', g.id.slice(-6), 'botCount:', g.botCount, 'gameSpeed:', g.gameSpeed));
  }

  // Vérifier combien de bots sont chargés
  const botVillages = await prisma.village.findMany({
    where: { isBot: true },
    select: { id: true, gameId: true, worldId: true }
  });

  console.log('\n\nBot villages summary:');
  console.log('Total bots in DB:', botVillages.length);
  console.log('Bots with gameId:', botVillages.filter(b => b.gameId).length);
  console.log('Bots with worldId:', botVillages.filter(b => b.worldId).length);

  await prisma.$disconnect();
})();
