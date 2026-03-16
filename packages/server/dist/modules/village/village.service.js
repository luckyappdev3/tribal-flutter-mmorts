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
        // Attention : Vérifie que tes IDs de bâtiments en JSON sont bien woodcutter, clay_pit, etc.
        const woodLevel = getLevel('woodcutter');
        const clayLevel = getLevel('clay_pit');
        const ironLevel = getLevel('iron_mine');
        const warehouseLevel = getLevel('warehouse');
        // 3. Calculer le temps écoulé
        const now = new Date();
        const hoursPassed = (now.getTime() - village.lastUpdate.getTime()) / (1000 * 3600);
        // 4. Calculer la production
        const woodProd = (0, shared_1.calcResourceProduction)(woodLevel);
        const clayProd = (0, shared_1.calcResourceProduction)(clayLevel);
        const ironProd = (0, shared_1.calcResourceProduction)(ironLevel);
        const maxStorage = (0, shared_1.calcMaxStorage)(warehouseLevel);
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
exports.VillageService = VillageService;
