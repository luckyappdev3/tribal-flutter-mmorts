import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🌱 Début du Seeding ---');

  // 1. Nettoyage des données (Ordre strict pour les relations)
  await prisma.buildingInstance.deleteMany();
  await prisma.village.deleteMany();
  await prisma.player.deleteMany();

  const hashedPassword = await bcrypt.hash('a', 10);

  // 2. Création du Joueur
  const player = await prisma.player.create({
    data: {
      username: 'Joueur A',
      email: 'a',
      password: hashedPassword,
    },
  });

  const playerb = await prisma.player.create({
    data: {
      username: 'Joueur B',
      email: 'b',
      password: hashedPassword,
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

  // 3b. Création du Village pour le Joueur B
  const villageB = await prisma.village.create({
    data: {
      name: 'Village de B',
      x: 510, // On change les coordonnées pour éviter les conflits
      y: 510,
      playerId: playerb.id, // On utilise bien playerb ici
      wood: 500,
      stone: 500,
      iron: 400,
    },
  });
  console.log(`✅ Village B créé à (510,510)`);

  // 4. Ajout des bâtiments (Instances individuelles)
  // On ajoute le QG ET le camp de bois pour tester la production
  await prisma.buildingInstance.createMany({
    data: [
      { buildingId: 'headquarters', level: 1, villageId: village.id },
    { buildingId: 'timber_camp',  level: 1, villageId: village.id },
    { buildingId: 'quarry',       level: 1, villageId: village.id }, // ← ajouter
    { buildingId: 'iron_mine',    level: 1, villageId: village.id }, // ← ajouter
    { buildingId: 'warehouse',    level: 1, villageId: village.id },
     { buildingId: 'barracks',     level: 1, villageId: village.id }, // ← ajouter
    ],
  });

  // 4b. Ajout des bâtiments pour le Village B
  await prisma.buildingInstance.createMany({
    data: [
      { buildingId: 'headquarters', level: 1, villageId: villageB.id },
      { buildingId: 'timber_camp',  level: 1, villageId: villageB.id },
      { buildingId: 'quarry',       level: 1, villageId: villageB.id },
      { buildingId: 'iron_mine',    level: 1, villageId: villageB.id },
      { buildingId: 'warehouse',    level: 1, villageId: villageB.id },
    ],
  });
  console.log(`✅ Bâtiments du Village B ajoutés.`);
  
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