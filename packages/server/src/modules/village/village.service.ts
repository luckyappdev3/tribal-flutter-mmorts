import { PrismaClient } from '@prisma/client';
import { calcResourceProduction, calcMaxStorage } from '@mmorts/shared';

export class VillageService {
  // On utilise le prisma passé au constructeur (depuis le main.ts)
  constructor(private prisma: PrismaClient) {}

  /**
   * Calcule et met à jour les ressources produites depuis la dernière visite.
   * Renommé en updateResources pour matcher l'appel du ConstructionService
   */
  async updateResources(villageId: string) {
    // 1. Récupérer le village avec ses bâtiments
    const village = await this.prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    });

    if (!village) throw new Error('Village non trouvé');

    // 2. Extraire les niveaux
    const getLevel = (type: string) => 
      village.buildings.find(b => b.buildingId === type)?.level || 0;

    // Attention : Vérifie que tes IDs de bâtiments en JSON sont bien woodcutter, clay_pit, etc.
    const woodLevel = getLevel('woodcutter');
    const clayLevel = getLevel('clay_pit');
    const ironLevel = getLevel('iron_mine');
    const warehouseLevel = getLevel('warehouse');

    // 3. Calculer le temps écoulé
    const now = new Date();
    const hoursPassed = (now.getTime() - village.lastUpdate.getTime()) / (1000 * 3600);

    // 4. Calculer la production
    const woodProd = calcResourceProduction(woodLevel);
    const clayProd = calcResourceProduction(clayLevel);
    const ironProd = calcResourceProduction(ironLevel);
    const maxStorage = calcMaxStorage(warehouseLevel);
    
    // 5. Calculer le nouveau stock
    const newWood = Math.min(village.wood + (woodProd * hoursPassed), maxStorage);
    const newClay = Math.min(village.clay + (clayProd * hoursPassed), maxStorage);
    const newIron = Math.min(village.iron + (ironProd * hoursPassed), maxStorage);

    // 6. Sauvegarder
    return await this.prisma.village.update({
      where: { id: villageId },
      data: {
        wood: newWood,
        clay: newClay,
        iron: newIron,
        lastUpdate: now,
      },
    });
  }
}