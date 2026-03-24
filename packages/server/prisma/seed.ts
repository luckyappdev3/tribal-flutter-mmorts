import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
//  Configuration du monde
// ─────────────────────────────────────────────────────────────
const GAME_SPEED    = 200.0;  // ← Modifier ici pour changer la vitesse globale
                              //   1.0 = vitesse officielle TW
                              //   10.0 = x10 plus rapide (recommandé pour le dev)
                              //   100.0 = ultra-rapide pour les tests

// ─────────────────────────────────────────────────────────────
//  Ressources de départ
// ─────────────────────────────────────────────────────────────
const STARTING_RESOURCES = { wood: 500, stone: 500, iron: 500 };

// ─────────────────────────────────────────────────────────────
//  Bâtiments de départ (tous les villages commencent avec ça)
// ─────────────────────────────────────────────────────────────
const STARTING_BUILDINGS = [
  { buildingId: 'headquarters', level: 1 },
  { buildingId: 'timber_camp',  level: 1 },
  { buildingId: 'quarry',       level: 1 },
  { buildingId: 'iron_mine',    level: 1 },
  { buildingId: 'warehouse',    level: 1 },
  { buildingId: 'farm',         level: 1 },
];

// ─────────────────────────────────────────────────────────────
//  Config Joueur A (village full-maxé)
// ─────────────────────────────────────────────────────────────
const MAX_RESOURCES = 400_000;

const MAX_BUILDINGS = [
  { buildingId: 'headquarters', level: 30 },
  { buildingId: 'timber_camp',  level: 30 },
  { buildingId: 'quarry',       level: 30 },
  { buildingId: 'iron_mine',    level: 30 },
  { buildingId: 'warehouse',    level: 30 },
  { buildingId: 'farm',         level: 30 },
  { buildingId: 'barracks',     level: 25 },
  { buildingId: 'stable',       level: 20 },
  { buildingId: 'garage',       level: 15 },
  { buildingId: 'rally_point',  level: 1  },
  { buildingId: 'smith',        level: 20 },
  { buildingId: 'wall',         level: 20 },
  { buildingId: 'market',       level: 25 },
  { buildingId: 'hiding_spot',  level: 10 },
  { buildingId: 'statue',       level: 1  },
  { buildingId: 'snob',         level: 3  },
];

const ALL_UNIT_TYPES = [
  'spearman', 'swordsman', 'axeman', 'archer', 'scout',
  'light_cavalry', 'mounted_archer', 'heavy_cavalry',
  'ram', 'catapult', 'paladin', 'noble',
];

async function createVillageWithBuildings(
  name: string,
  x: number,
  y: number,
  playerId: string,
  worldId: string,
) {
  const village = await prisma.village.create({
    data: {
      name,
      x,
      y,
      playerId,
      worldId,
      wood:  STARTING_RESOURCES.wood,
      stone: STARTING_RESOURCES.stone,
      iron:  STARTING_RESOURCES.iron,
    },
  });

  await prisma.buildingInstance.createMany({
    data: STARTING_BUILDINGS.map(b => ({ ...b, villageId: village.id })),
  });

  return village;
}

async function createMaxVillageForPlayerA(
  name: string,
  x: number,
  y: number,
  playerId: string,
  worldId: string,
) {
  const village = await prisma.village.create({
    data: {
      name,
      x,
      y,
      playerId,
      worldId,
      wood:  MAX_RESOURCES,
      stone: MAX_RESOURCES,
      iron:  MAX_RESOURCES,
      food:  MAX_RESOURCES,
      // champs directs sur Village
      timberCampLevel: 30,
      quarryLevel:     30,
      ironMineLevel:   30,
      farmLevel:       30,
      wallLevel:       20,
      stableLevel:     20,
      rallyPointLevel: 1,
    },
  });

  await prisma.buildingInstance.createMany({
    data: MAX_BUILDINGS.map(b => ({ ...b, villageId: village.id })),
  });

  await prisma.troop.createMany({
    data: ALL_UNIT_TYPES.map(unitType => ({
      unitType,
      count: 10,
      villageId: village.id,
    })),
  });

  return village;
}

async function main() {
  console.log('--- 🌱 Début du Seeding ---\n');

  // ── Nettoyage complet ──────────────────────────────────────
  await prisma.attackReport.deleteMany();
  await prisma.activeAttack.deleteMany();
  await prisma.buildingQueueItem.deleteMany();
  await prisma.buildingQueue.deleteMany();
  await prisma.recruitQueue.deleteMany();
  await prisma.troop.deleteMany();
  await prisma.buildingInstance.deleteMany();
  await prisma.village.deleteMany();
  await prisma.player.deleteMany();
  await prisma.gameWorld.deleteMany();

  console.log('✅ Base de données nettoyée\n');

  // ── Création du Monde ──────────────────────────────────────
  const world = await prisma.gameWorld.create({
    data: {
      name:      'Monde Classique',
      gameSpeed: GAME_SPEED,
    },
  });

  console.log(`✅ Monde créé : "${world.name}" (vitesse ×${world.gameSpeed})\n`);

  // ── Création des joueurs ───────────────────────────────────
  const hashedPassword = await bcrypt.hash('a', 10);

  const playerA = await prisma.player.create({
    data: { username: 'Joueur A', email: 'a', password: hashedPassword },
  });

  const playerB = await prisma.player.create({
    data: { username: 'Joueur B', email: 'b', password: hashedPassword },
  });

  const playerE = await prisma.player.create({
    data: { username: 'yildirim', email: 'e', password: hashedPassword },
  });

  const playerH = await prisma.player.create({
    data: { username: 'Joueur H', email: 'h', password: hashedPassword },
  });

  console.log(`✅ Joueurs créés : ${playerA.username}, ${playerB.username}, ${playerE.username}, ${playerH.username}\n`);

  // ── Création des villages ──────────────────────────────────
  const villageA = await createMaxVillageForPlayerA(
    'Village de A', 500, 500, playerA.id, world.id,
  );

  const villageB = await createVillageWithBuildings(
    'Village de B', 510, 510, playerB.id, world.id,
  );

  const villageE = await createVillageWithBuildings(
    'Village principal', 490, 495, playerE.id, world.id,
  );

  const villageH = await createVillageWithBuildings(
    'Village de H', 502, 500, playerH.id, world.id,
  );

  // Bâtiments supplémentaires pour H : écurie niv 1 + place d'armes niv 1
  // (prérequis écurie : headquarters 10, barracks 5, smith 5)
  await prisma.buildingInstance.createMany({
    data: [
      { buildingId: 'headquarters', level: 10, villageId: villageH.id },
      { buildingId: 'barracks',     level: 5,  villageId: villageH.id },
      { buildingId: 'smith',        level: 5,  villageId: villageH.id },
      { buildingId: 'stable',       level: 1,  villageId: villageH.id },
      { buildingId: 'rally_point',  level: 1,  villageId: villageH.id },
    ],
    skipDuplicates: true,
  });

  await prisma.troop.createMany({
    data: [
      { unitType: 'spearman', count: 5, villageId: villageH.id },
      { unitType: 'scout',    count: 5, villageId: villageH.id },
    ],
  });

  console.log(`✅ Villages créés avec bâtiments de départ`);
  console.log(`   - ${villageA.name} (${villageA.x}, ${villageA.y})`);
  console.log(`   - ${villageB.name} (${villageB.x}, ${villageB.y})`);
  console.log(`   - ${villageE.name} (${villageE.x}, ${villageE.y})`);
  console.log(`   - ${villageH.name} (${villageH.x}, ${villageH.y})\n`);

  console.log('--- 🚀 Seeding terminé avec succès ---');
  console.log(`\n📋 Comptes disponibles :`);
  console.log(`   email: a  | password: a`);
  console.log(`   email: b  | password: a`);
  console.log(`   email: e  | password: a`);
  console.log(`   email: h  | password: a`);
  console.log(`\n⚙️  Vitesse du monde : ×${GAME_SPEED}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });