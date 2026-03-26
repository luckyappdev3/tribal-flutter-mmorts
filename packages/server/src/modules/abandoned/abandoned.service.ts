import { PrismaClient } from '@prisma/client';
import { calcMaxStorage } from '@mmorts/shared';

const ABANDONED_COUNT    = 200;
const MAP_MIN = 0;
const MAP_MAX = 40;

// Ressources initiales proportionnelles au niveau
function initialResources(level: number) {
  const base = level * 200;
  return {
    wood:  base + Math.floor(Math.random() * base),
    stone: base + Math.floor(Math.random() * base),
    iron:  Math.floor(base * 0.8) + Math.floor(Math.random() * base * 0.5),
  };
}

// Niveaux de bâtiments selon le niveau du village abandonné
function buildingsForLevel(level: number) {
  // timber_camp, quarry, iron_mine, warehouse entre 1 et level
  const rand = (max: number) => Math.max(1, Math.floor(Math.random() * max) + 1);
  return [
    { buildingId: 'timber_camp', level: rand(level) },
    { buildingId: 'quarry',      level: rand(level) },
    { buildingId: 'iron_mine',   level: rand(level) },
    { buildingId: 'warehouse',   level: rand(level) },
  ];
}

export class AbandonedVillageService {
  constructor(private prisma: PrismaClient) {}

  async seedAbandoned() {
    // Vérifier combien de villages abandonnés existent déjà
    const existing = await this.prisma.village.count({
      where: { isAbandoned: true },
    });

    if (existing >= ABANDONED_COUNT) {
      console.log(`✅ ${existing} villages abandonnés déjà présents — skip`);
      return;
    }

    const toCreate = ABANDONED_COUNT - existing;
    console.log(`🏚️  Création de ${toCreate} villages abandonnés...`);

    // Récupérer toutes les cases occupées
    const occupied = await this.prisma.village.findMany({
      select: { x: true, y: true },
    });
    const occupiedSet = new Set(occupied.map(v => `${v.x},${v.y}`));

    let created = 0;
    let attempts = 0;

    while (created < toCreate && attempts < toCreate * 20) {
      attempts++;

      // Placer les villages abandonnés loin de la zone joueur (200-999)
      const x = MAP_MIN + Math.floor(Math.random() * (MAP_MAX - MAP_MIN));
      const y = MAP_MIN + Math.floor(Math.random() * (MAP_MAX - MAP_MIN));
      const key = `${x},${y}`;

      if (occupiedSet.has(key)) continue;
      occupiedSet.add(key);

      const level     = Math.ceil(Math.random() * 10); // 1-10
      const resources = initialResources(level);
      const buildings = buildingsForLevel(level);

      try {
        await this.prisma.village.create({
          data: {
            name:          `Ruines (${x},${y})`,
            x,
            y,
            isAbandoned:   true,
            abandonedLevel: level,
            wood:          resources.wood,
            stone:         resources.stone,
            iron:          resources.iron,
            buildings: {
              create: buildings,
            },
          },
        });
        created++;
      } catch {
        // Conflit de coordonnées → retry
      }
    }

    console.log(`✅ ${created} villages abandonnés créés`);
  }

  // Remet les ressources d'un village abandonné après pillage
  // (la production naturelle suffit, mais on s'assure d'un stock minimum)
  async resetAfterRaid(villageId: string) {
    const village = await this.prisma.village.findUnique({
      where:   { id: villageId },
      include: { buildings: true },
    });
    if (!village || !village.isAbandoned) return;

    const level   = village.abandonedLevel;
    const minWood  = level * 50;
    const minStone = level * 50;
    const minIron  = level * 40;

    // Si les ressources sont trop basses, remettre un minimum
    if (village.wood < minWood || village.stone < minStone || village.iron < minIron) {
      await this.prisma.village.update({
        where: { id: villageId },
        data: {
          wood:  Math.max(village.wood,  minWood),
          stone: Math.max(village.stone, minStone),
          iron:  Math.max(village.iron,  minIron),
        },
      });
    }
  }
}
