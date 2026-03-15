"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcResourceProduction = void 0;
/**
 * Calcule la production horaire selon le niveau du bâtiment.
 * Basé sur la logique Tribal Wars.
 */
const calcResourceProduction = (level, baseProd = 30, multiplier = 1.5) => {
    if (level === 0)
        return 5; // Production de base minimale
    return Math.round(baseProd * Math.pow(multiplier, level - 1));
};
exports.calcResourceProduction = calcResourceProduction;
//# sourceMappingURL=production.formulas.js.map