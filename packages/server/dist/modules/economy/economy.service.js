"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomyService = void 0;
const prisma_client_1 = require("../../infra/db/prisma.client");
const shared_1 = require("@mmorts/shared");
class EconomyService {
    async processVillageTick(villageId) {
        const village = await prisma_client_1.prisma.village.findUnique({
            where: { id: villageId },
            include: { buildings: true },
        });
        if (!village)
            return null;
        const now = new Date();
        const lastTickDate = new Date(village.lastTick);
        const elapsedMs = now.getTime() - lastTickDate.getTime();
        if (elapsedMs <= 0)
            return village;
        // Récupération des niveaux depuis BuildingInstance
        const getLevel = (bid) => village.buildings.find(b => b.buildingId === bid)?.level || 0;
        const woodGain = (0, shared_1.calcResourceProduction)(getLevel('timber_camp'), elapsedMs);
        const stoneGain = (0, shared_1.calcResourceProduction)(getLevel('quarry'), elapsedMs);
        const ironGain = (0, shared_1.calcResourceProduction)(getLevel('iron_mine'), elapsedMs);
        const warehouseLevel = getLevel('warehouse');
        const max = (0, shared_1.calcMaxStorage)(warehouseLevel);
        return await prisma_client_1.prisma.village.update({
            where: { id: villageId },
            data: {
                wood: Math.min(village.wood + woodGain, max),
                stone: Math.min(village.stone + stoneGain, max),
                iron: Math.min(village.iron + ironGain, max),
                lastTick: now,
            },
        });
    }
}
exports.EconomyService = EconomyService;
