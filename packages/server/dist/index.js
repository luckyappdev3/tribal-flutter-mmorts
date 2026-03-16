"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcResourceProduction = exports.GameFormulas = exports.GAME_CONFIG = exports.ResourcesSchema = exports.BUILDING_TYPES = void 0;
const zod_1 = require("zod");
// --- TYPES DE BÂTIMENTS ---
exports.BUILDING_TYPES = [
    'headquarters',
    'woodcutter', // Scierie (Bois)
    'quarry', // Carrière (Pierre)
    'iron_mine', // Mine (Fer)
    'warehouse',
    'farm'
];
// --- SCHÉMAS DE VALIDATION (Zod) ---
// Aligné sur ton schéma Prisma (wood, stone, iron)
exports.ResourcesSchema = zod_1.z.object({
    wood: zod_1.z.number().nonnegative(),
    stone: zod_1.z.number().nonnegative(),
    iron: zod_1.z.number().nonnegative(),
});
// --- CONSTANTES ÉCONOMIQUES ---
exports.GAME_CONFIG = {
    PROD_BASE: 30, // Production par heure au niveau 1
    PROD_EXPONENT: 1.5,
    STORAGE_BASE: 1000,
    STORAGE_EXPONENT: 1.2,
};
// --- LOGIQUE PARTAGÉE (Formules) ---
exports.GameFormulas = {
    /**
     * Calculer la production horaire théorique selon le niveau
     */
    calculateHourlyProduction: (level) => {
        if (level === 0)
            return 5;
        return Math.round(exports.GAME_CONFIG.PROD_BASE * Math.pow(exports.GAME_CONFIG.PROD_EXPONENT, level - 1));
    },
    /**
     * Calculer le gain de ressources pour un intervalle de temps donné
     * Cette formule est celle utilisée par le EconomyService (Server)
     */
    calcResourceProduction: (level, elapsedMs) => {
        const hourlyProd = exports.GameFormulas.calculateHourlyProduction(level);
        // (Prod / 3600000 ms) * temps écoulé
        return (hourlyProd / 3600000) * elapsedMs;
    },
    calculateStorage: (level) => {
        return Math.round(exports.GAME_CONFIG.STORAGE_BASE * Math.pow(exports.GAME_CONFIG.STORAGE_EXPONENT, level - 1));
    }
};
// Export individuel pour faciliter l'import dans le serveur
exports.calcResourceProduction = exports.GameFormulas.calcResourceProduction;
