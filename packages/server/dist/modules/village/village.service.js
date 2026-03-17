"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VillageService = void 0;
const shared_1 = require("@mmorts/shared");
class VillageService {
    prisma;
    // On utilise le prisma passé au constructeur (depuis le main.ts)
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Calcule et met à jour les ressources produites depuis la dernière visite.
     * Renommé en updateResources pour matcher l'appel du ConstructionService
     */
    async updateResources(villageId) {
        // 1. Récupérer le village avec ses bâtiments
        const village = await this.prisma.village.findUnique({
            where: { id: villageId },
            include: { buildings: true },
        });
        if (!village)
            throw new Error('Village non trouvé');
        // 2. Extraire les niveaux
        const getLevel = (type) => village.buildings.find(b => b.buildingId === type)?.level || 0;
        // Attention : Vérifie que tes IDs de bâtiments en JSON sont bien timber_camp, clay_pit, etc.
        const woodLevel = getLevel('timber_camp');
        const stoneLevel = getLevel('quarry');
        const ironLevel = getLevel('iron_mine');
        const warehouseLevel = getLevel('warehouse');
        // 3. Calculer le temps écoulé
        const now = new Date();
        const hoursPassed = (now.getTime() - village.lastTick.getTime()) / (1000 * 3600);
        // 4. Calculer la production
        const woodProd = shared_1.ProductionFormulas.getHourlyRate(woodLevel);
        const stoneProd = shared_1.ProductionFormulas.getHourlyRate(stoneLevel); // anciennement clayLevel
        const ironProd = shared_1.ProductionFormulas.getHourlyRate(ironLevel);
        const maxStorage = (0, shared_1.calcMaxStorage)(warehouseLevel);
        // 5. Calculer le nouveau stock
        const newWood = Math.min(village.wood + (woodProd * hoursPassed), maxStorage);
        const newStone = Math.min(village.stone + (stoneProd * hoursPassed), maxStorage);
        const newIron = Math.min(village.iron + (ironProd * hoursPassed), maxStorage);
        // 6. Sauvegarder
        return await this.prisma.village.update({
            where: { id: villageId },
            data: {
                wood: newWood,
                stone: newStone,
                iron: newIron,
                lastTick: now,
            },
        });
    }
}
exports.VillageService = VillageService;
