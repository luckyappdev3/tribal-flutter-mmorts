import { PrismaClient } from '@prisma/client';
import { ProductionFormulas, calcMaxStorage } from '@mmorts/shared';

export class VillageService {
  constructor(private prisma: PrismaClient) {}

  async updateResources(villageId: string) {
    const village = await this.prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    });

    if (!village) throw new Error('Village non trouvé');

    const getLevel = (bid: string) =>
      village.buildings.find(b => b.buildingId === bid)?.level || 0;

    // IDs alignés sur les fichiers JSON dans game-data/buildings/
    const woodLevel      = getLevel('timber_camp');
    const stoneLevel     = getLevel('quarry');
    const ironLevel      = getLevel('iron_mine');
    const warehouseLevel = getLevel('warehouse');

    const now = new Date();
    const hoursPassed = (now.getTime() - village.lastTick.getTime()) / 3600000;

    const woodProd  = ProductionFormulas.getHourlyRate(woodLevel);
    const stoneProd = ProductionFormulas.getHourlyRate(stoneLevel);
    const ironProd  = ProductionFormulas.getHourlyRate(ironLevel);
    const max       = calcMaxStorage(warehouseLevel);

    const newWood  = Math.min(village.wood  + woodProd  * hoursPassed, max);
    const newStone = Math.min(village.stone + stoneProd * hoursPassed, max);
    const newIron  = Math.min(village.iron  + ironProd  * hoursPassed, max);

    return await this.prisma.village.update({
      where: { id: villageId },
      data: {
        wood:     newWood,
        stone:    newStone,
        iron:     newIron,
        lastTick: now,
      },
    });
  }
}
