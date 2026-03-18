"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructionService = void 0;
const formulas_1 = require("@mmorts/shared/formulas");
class ConstructionService {
    prisma;
    buildQueue;
    gameData;
    villageService;
    constructor(prisma, buildQueue, gameData, villageService) {
        this.prisma = prisma;
        this.buildQueue = buildQueue;
        this.gameData = gameData;
        this.villageService = villageService;
    }
    async startUpgrade(villageId, buildingId) {
        // 1. Sync des ressources (lazy eval)
        await this.villageService.updateResources(villageId);
        // 2. Une seule construction à la fois
        const existingJob = await this.prisma.buildingQueue.findUnique({
            where: { villageId },
        });
        if (existingJob) {
            throw new Error('Un bâtiment est déjà en cours de construction.');
        }
        // 3. Niveau actuel → niveau cible
        const buildingInstance = await this.prisma.buildingInstance.findUnique({
            where: { villageId_buildingId: { villageId, buildingId } },
        });
        const currentLevel = buildingInstance?.level ?? 0;
        const targetLevel = currentLevel + 1;
        const buildingDef = this.gameData.getBuildingDef(buildingId);
        // 4. Coûts et durée
        const costs = (0, formulas_1.calculateCostForLevel)(buildingDef, targetLevel);
        const durationMs = (0, formulas_1.calculateTimeForLevel)(buildingDef, targetLevel) * 1000;
        // 5. Transaction atomique : vérification, déduction, création en queue
        return await this.prisma.$transaction(async (tx) => {
            const village = await tx.village.findUnique({ where: { id: villageId } });
            if (!village ||
                village.wood < costs.wood ||
                village.stone < costs.stone || // 
                village.iron < costs.iron) {
                throw new Error('Ressources insuffisantes pour lancer l\'amélioration.');
            }
            await tx.village.update({
                where: { id: villageId },
                data: {
                    wood: { decrement: costs.wood || 0 },
                    stone: { decrement: costs.stone || 0 }, // Si c'est undefined, ça devient 0
                    iron: { decrement: costs.iron || 0 },
                },
            });
            const endsAt = new Date(Date.now() + durationMs);
            const queueEntry = await tx.buildingQueue.create({
                data: { villageId, buildingId, targetLevel, endsAt },
            });
            await this.buildQueue.addJob({ villageId, buildingId, targetLevel }, durationMs);
            return queueEntry;
        });
    }
}
exports.ConstructionService = ConstructionService;
