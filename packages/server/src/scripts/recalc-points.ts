import { PrismaClient } from '@prisma/client';
import { calculateVillagePoints } from '@mmorts/shared';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Recalcul des points de tous les joueurs...\n');

  const buildingsPath = path.resolve(__dirname, '../../../../packages/shared/game-data/buildings');
  const buildingDefs: Record<string, any> = {};

  for (const file of fs.readdirSync(buildingsPath)) {
    if (!file.endsWith('.json')) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(buildingsPath, file), 'utf-8'));
    buildingDefs[raw.id] = raw;
  }

  const getBuildingDef = (id: string) => buildingDefs[id] ?? null;

  const players = await prisma.player.findMany({
    include: { villages: { include: { buildings: true } } },
  });

  for (const player of players) {
    let totalPoints = 0;
    for (const village of player.villages) {
      totalPoints += calculateVillagePoints(
        village.buildings.map(b => ({ buildingId: b.buildingId, level: b.level })),
        getBuildingDef,
      );
    }
    await prisma.player.update({ where: { id: player.id }, data: { totalPoints } });
    console.log(`✅ ${player.username} : ${totalPoints} pts`);
  }

  console.log(`\n✅ Recalcul terminé pour ${players.length} joueurs.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
