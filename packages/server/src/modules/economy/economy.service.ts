import { prisma } from '../../infra/db/prisma.client';
import { calcResourceProduction, calcMaxStorage } from '@mmorts/shared';

export class EconomyService {
  async processVillageTick(villageId: string) {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    });

    if (!village) return null;

    const now = new Date();
    const lastTickDate = new Date(village.lastTick);
    const elapsedMs = now.getTime() - lastTickDate.getTime();

    if (elapsedMs <= 0) return village;

    // Récupération des niveaux depuis BuildingInstance
    const getLevel = (bid: string) =>
      village.buildings.find(b => b.buildingId === bid)?.level || 0;

    const woodGain  = calcResourceProduction(getLevel('timber_camp'), elapsedMs);
    const stoneGain = calcResourceProduction(getLevel('quarry'),      elapsedMs);
    const ironGain  = calcResourceProduction(getLevel('iron_mine'),   elapsedMs);

    const warehouseLevel = getLevel('warehouse');
    const max = calcMaxStorage(warehouseLevel);

    return await prisma.village.update({
      where: { id: villageId },
      data: {
        wood:     Math.min(village.wood  + woodGain,  max),
        stone:    Math.min(village.stone + stoneGain, max),
        iron:     Math.min(village.iron  + ironGain,  max),
        lastTick: now,
      },
    });
  }
}
