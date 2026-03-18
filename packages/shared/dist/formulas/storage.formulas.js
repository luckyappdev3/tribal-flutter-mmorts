"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcProtectedResources = exports.calcMaxStorage = void 0;
/**
 * Calcule la capacité maximale de l'entrepôt selon son niveau.
 */
const calcMaxStorage = (level) => {
    if (level === 0)
        return 5000; // Pas d'entrepôt = stock de base
    return Math.round(5000 * Math.pow(1.5, level - 1)); // Niv 1 = 5000, Niv 2 = 7500...
};
exports.calcMaxStorage = calcMaxStorage;
/**
 * Calcule les ressources protégées (Cachette)
 */
const calcProtectedResources = (level) => {
    return level * 100; // Exemple simple : 100 par niveau
};
exports.calcProtectedResources = calcProtectedResources;
//# sourceMappingURL=storage.formulas.js.map