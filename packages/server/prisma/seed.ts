import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
//  Configuration du monde
// ─────────────────────────────────────────────────────────────
const GAME_SPEED    = 10.0;  // ← Modifier ici pour changer la vitesse globale
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
  const hashedPassword = await bcrypt.hash('azerty', 10);

  const playerA = await prisma.player.create({
    data: { username: 'Joueur A', email: 'a', password: hashedPassword },
  });

  const playerB = await prisma.player.create({
    data: { username: 'Joueur B', email: 'b', password: hashedPassword },
  });

  const playerE = await prisma.player.create({
    data: { username: 'yildirim', email: 'e', password: hashedPassword },
  });

  console.log(`✅ Joueurs créés : ${playerA.username}, ${playerB.username}, ${playerE.username}\n`);

  // ── Création des villages ──────────────────────────────────
  const villageA = await createVillageWithBuildings(
    'Village de A', 500, 500, playerA.id, world.id,
  );

  const villageB = await createVillageWithBuildings(
    'Village de B', 510, 510, playerB.id, world.id,
  );

  const villageE = await createVillageWithBuildings(
    'Village principal', 490, 495, playerE.id, world.id,
  );

  console.log(`✅ Villages créés avec bâtiments de départ`);
  console.log(`   - ${villageA.name} (${villageA.x}, ${villageA.y})`);
  console.log(`   - ${villageB.name} (${villageB.x}, ${villageB.y})`);
  console.log(`   - ${villageE.name} (${villageE.x}, ${villageE.y})\n`);

  console.log('--- 🚀 Seeding terminé avec succès ---');
  console.log(`\n📋 Comptes disponibles :`);
  console.log(`   email: a  | password: azerty`);
  console.log(`   email: b  | password: azerty`);
  console.log(`   email: e  | password: azerty`);
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