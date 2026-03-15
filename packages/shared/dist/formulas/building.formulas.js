"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCostForLevel = calculateCostForLevel;
exports.calculateTimeForLevel = calculateTimeForLevel;
/**
 * Calcule les ressources nécessaires pour un niveau spécifique
 * Basé sur la formule : Base * Multiplicateur ^ (Niveau - 1)
 */
function calculateCostForLevel(definition, level) {
    // Niveau 1 = Coût de base direct
    if (level === 1)
        return definition.baseStats.baseCost;
    const multiplier = Math.pow(definition.baseStats.costMultiplier, level - 1);
    return {
        wood: Math.floor(definition.baseStats.baseCost.wood * multiplier),
        clay: Math.floor(definition.baseStats.baseCost.clay * multiplier),
        iron: Math.floor(definition.baseStats.baseCost.iron * multiplier),
        // Utilisation de || 0 pour garantir un calcul même si food est absent du JSON
        food: Math.floor((definition.baseStats.baseCost.food || 0) * multiplier),
    };
}
/**
 * Calcule le temps de construction (en secondes) pour un niveau spécifique
 */
function calculateTimeForLevel(definition, level) {
    if (level === 1)
        return definition.baseStats.baseBuildTime;
    const multiplier = Math.pow(definition.baseStats.timeMultiplier, level - 1);
    return Math.floor(definition.baseStats.baseBuildTime * multiplier);
}
//# sourceMappingURL=building.formulas.js.map