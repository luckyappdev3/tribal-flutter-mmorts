"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VillageService = void 0;
class VillageService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async updateResources(villageId) {
        const village = await this.prisma.village.findUnique({
            where: { id: villageId },
            include: { buildings: true },
        });
        if (!village)
            throw new Error('Village non trouvé');
        return village;
    }
}
exports.VillageService = VillageService;
