"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TroopsService = void 0;
class TroopsService {
    prisma;
    gameData;
    recruitQ;
    constructor(prisma, gameData, recruitQ) {
        this.prisma = prisma;
        this.gameData = gameData;
        this.recruitQ = recruitQ;
    }
    // ── Liste des troupes disponibles dans un village ──
    async getTroops(villageId) {
        const troops = await this.prisma.troop.findMany({ where: { villageId } });
        const queue = await this.prisma.recruitQueue.findUnique({ where: { villageId } });
        // Enrichir avec les stats de chaque unité
        const allUnits = this.gameData.getAllUnits();
        const troopMap = Object.fromEntries(troops.map(t => [t.unitType, t.count]));
        return {
            troops: allUnits.map(u => ({
                unitType: u.id,
                name: u.name,
                count: troopMap[u.id] ?? 0,
                attack: u.attack,
                defense: u.defense,
                speed: u.speed,
                carryCapacity: u.carryCapacity,
                cost: u.cost,
                recruitTime: u.recruitTime,
            })),
            queue,
        };
    }
    // ── Lancer un recrutement ──
    async startRecruit(villageId, unitType, count) {
        if (count <= 0)
            throw new Error('La quantité doit être supérieure à 0.');
        // 1. Vérifier que la caserne existe et est niveau ≥ 1
        const barracks = await this.prisma.buildingInstance.findUnique({
            where: { villageId_buildingId: { villageId, buildingId: 'barracks' } },
        });
        if (!barracks || barracks.level < 1) {
            throw new Error('Vous devez construire une Caserne pour recruter des troupes.');
        }
        // 2. Vérifier qu'aucun recrutement n'est en cours
        const existing = await this.prisma.recruitQueue.findUnique({ where: { villageId } });
        if (existing)
            throw new Error('Un recrutement est déjà en cours.');
        // 3. Récupérer la définition de l'unité
        const unitDef = this.gameData.getUnitDef(unitType);
        // 4. Calcul du coût total
        const totalCost = {
            wood: unitDef.cost.wood * count,
            stone: unitDef.cost.stone * count,
            iron: unitDef.cost.iron * count,
        };
        // 5. Bonus de vitesse de la caserne (−5% par niveau)
        const barracksDef = this.gameData.getBuildingDef('barracks');
        const speedBonus = 1 - (barracks.level * (barracksDef.baseStats.specialMultiplier ?? 0.05));
        const durationMs = Math.floor(unitDef.recruitTime * count * 1000 * speedBonus);
        // 6. Transaction : vérif ressources → déduction → création queue → job BullMQ
        return await this.prisma.$transaction(async (tx) => {
            const village = await tx.village.findUnique({ where: { id: villageId } });
            if (!village ||
                village.wood < totalCost.wood ||
                village.stone < totalCost.stone ||
                village.iron < totalCost.iron) {
                throw new Error('Ressources insuffisantes pour ce recrutement.');
            }
            await tx.village.update({
                where: { id: villageId },
                data: {
                    wood: { decrement: totalCost.wood },
                    stone: { decrement: totalCost.stone },
                    iron: { decrement: totalCost.iron },
                },
            });
            const endsAt = new Date(Date.now() + durationMs);
            const entry = await tx.recruitQueue.create({
                data: { villageId, unitType, count, endsAt },
            });
            await this.recruitQ.addJob({ villageId, unitType, count }, durationMs);
            return {
                ...entry,
                durationMs,
                totalCost,
                unitName: unitDef.name,
            };
        });
    }
}
exports.TroopsService = TroopsService;
