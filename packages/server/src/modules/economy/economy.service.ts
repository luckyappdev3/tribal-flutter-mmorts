import { prisma } from '../../infra/db/prisma.client';
import { calcResourceProduction, calcMaxStorage } from '@mmorts/shared';

export class EconomyService {
  async processVillageTick(villageId: string) {
    const village = await prisma.village.findUnique({
      where:   { id: villageId },
      include: { buildings: true, world: { select: { gameSpeed: true } } },
    });

    if (!village) return null;

    const now         = new Date();
    const elapsedMs   = now.getTime() - new Date(village.lastTick).getTime();

    if (elapsedMs <= 0) return village;

    // gameSpeed accélère la production du même facteur que la construction
    const gameSpeed = (village as any).world?.gameSpeed ?? 1.0;

    const getLevel = (bid: string) =>
      village.buildings.find(b => b.buildingId === bid)?.level || 0;

    const woodGain  = calcResourceProduction(getLevel('timber_camp'), elapsedMs) * gameSpeed;
    const stoneGain = calcResourceProduction(getLevel('quarry'),      elapsedMs) * gameSpeed;
    const ironGain  = calcResourceProduction(getLevel('iron_mine'),   elapsedMs) * gameSpeed;

    const max = calcMaxStorage(getLevel('warehouse'));

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