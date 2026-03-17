import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🌱 Début du Seeding ---');

  // 1. Nettoyage des données (Ordre strict pour les relations)
  await prisma.buildingInstance.deleteMany();
  await prisma.village.deleteMany();
  await prisma.player.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Création du Joueur
  const player = await prisma.player.create({
    data: {
      username: 'GuerrierTest',
      email: 'a',
      password: 'a',
    },
  });
  console.log(`✅ Joueur créé : ${player.username}`);

  // 3. Création du Village (Ajout de 'food' pour correspondre au schéma)
  const village = await prisma.village.create({
    data: {
      name: 'Premier Village',
      x: 500,
      y: 500,
      playerId: player.id,
      wood: 500,
      stone: 500,
      iron: 400,
      //food: 100, // Initialisé pour ton ResourcesSchema
    },
  });
  console.log(`✅ Village créé à (500,500)`);

  // 4. Ajout des bâtiments (Instances individuelles)
  // On ajoute le QG ET le camp de bois pour tester la production
  await prisma.buildingInstance.createMany({
    data: [
      { buildingId: 'headquarters', level: 1, villageId: village.id },
    { buildingId: 'timber_camp',  level: 1, villageId: village.id },
    { buildingId: 'quarry',       level: 1, villageId: village.id }, // ← ajouter
    { buildingId: 'iron_mine',    level: 1, villageId: village.id }, // ← ajouter
    { buildingId: 'warehouse',    level: 1, villageId: village.id }, // ← ajouter
    ],
  });
  
  console.log(`✅ Bâtiments initiaux (QG et Camp de bois) ajoutés.`);
  console.log('--- 🚀 Seeding terminé avec succès ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });