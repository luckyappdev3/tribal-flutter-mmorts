"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcProtectedResources = exports.calcMaxStorage = void 0;
/**
 * Calcule la capacité maximale de l'entrepôt selon son niveau.
 */
var calcMaxStorage = function (level) {
    if (level <= 1)
        return 1000;
    // Progression exponentielle : environ +20% par niveau
    return Math.round(1000 * Math.pow(1.2, level - 1));
};
exports.calcMaxStorage = calcMaxStorage;
/**
 * Calcule les ressources protégées (Cachette)
 */
var calcProtectedResources = function (level) {
    return level * 100; // Exemple simple : 100 par niveau
};
exports.calcProtectedResources = calcProtectedResources;
