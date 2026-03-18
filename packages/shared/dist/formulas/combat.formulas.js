"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBattle = resolveBattle;
exports.calculateLoot = calculateLoot;
exports.calculateTravelTime = calculateTravelTime;
exports.calculatePointsExchanged = calculatePointsExchanged;
/**
 * Résout un combat entre attaquants et défenseurs.
 *
 * Formule Tribal Wars :
 * - Ratio = atkPower / (atkPower + defPower)
 * - Si ratio > 0.5 : attaquant gagne
 * - Pertes attaquant = (1 - ratio^(1/3)) × count  (les gagnants perdent moins)
 * - Pertes défenseur = ratio^(1/3) × count         (les perdants perdent plus)
 */
function resolveBattle(attackers, defenders) {
    const atkPower = attackers.reduce((s, u) => s + u.count * u.attack, 0);
    const defPower = defenders.reduce((s, u) => s + u.count * u.defense, 0);
    // Cas particulier : village vide, attaquant gagne sans pertes
    if (defPower === 0) {
        const loot = attackers.reduce((s, u) => s + u.count * u.carryCapacity, 0);
        return {
            attackerWon: true,
            attackerLosses: Object.fromEntries(attackers.map(u => [u.unitType, 0])),
            defenderLosses: Object.fromEntries(defenders.map(u => [u.unitType, u.count])),
            lootCapacity: loot,
        };
    }
    const totalPower = atkPower + defPower;
    const atkRatio = atkPower / totalPower;
    const attackerWon = atkRatio > 0.5;
    // Taux de pertes par camp
    const atkLossRate = attackerWon
        ? 1 - Math.pow(atkRatio, 1 / 3) // Gagnant perd moins
        : 1 - Math.pow(1 - atkRatio, 1 / 3); // Perdant perd plus
    const defLossRate = attackerWon
        ? Math.pow(atkRatio, 1 / 3)
        : Math.pow(1 - atkRatio, 1 / 3);
    // Calcul des pertes unité par unité
    const attackerLosses = {};
    let survivingCarry = 0;
    for (const u of attackers) {
        const lost = Math.ceil(u.count * atkLossRate);
        const survived = Math.max(0, u.count - lost);
        attackerLosses[u.unitType] = Math.min(lost, u.count);
        survivingCarry += survived * u.carryCapacity;
    }
    const defenderLosses = {};
    for (const u of defenders) {
        const lost = attackerWon
            ? u.count // Défenseur anéanti si perd
            : Math.ceil(u.count * defLossRate);
        defenderLosses[u.unitType] = Math.min(lost, u.count);
    }
    return {
        attackerWon,
        attackerLosses,
        defenderLosses,
        lootCapacity: attackerWon ? survivingCarry : 0,
    };
}
/**
 * Calcule les ressources pillées selon la capacité de transport.
 * Répartition équitable entre les 3 ressources.
 */
function calculateLoot(available, capacity) {
    const total = available.wood + available.stone + available.iron;
    if (total <= 0 || capacity <= 0) {
        return { wood: 0, stone: 0, iron: 0 };
    }
    // Si on peut tout prendre
    if (capacity >= total) {
        return {
            wood: Math.floor(available.wood),
            stone: Math.floor(available.stone),
            iron: Math.floor(available.iron),
        };
    }
    // Répartition proportionnelle
    const ratio = capacity / total;
    return {
        wood: Math.floor(available.wood * ratio),
        stone: Math.floor(available.stone * ratio),
        iron: Math.floor(available.iron * ratio),
    };
}
// ─────────────────────────────────────────────
// CALCUL DU TEMPS DE TRAJET
// ─────────────────────────────────────────────
/**
 * Calcule le temps de trajet en secondes.
 * Vitesse = unité la plus lente de l'armée.
 * Distance = Pythagore entre les deux villages.
 * 1 case = speed secondes pour l'unité la plus lente.
 */
function calculateTravelTime(x1, y1, x2, y2, units) {
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const slowest = Math.max(...units.map(u => u.speed)); // speed = secondes/case
    return Math.ceil(distance * slowest);
}
// ─────────────────────────────────────────────
// CALCUL DES POINTS PERDUS/GAGNÉS
// ─────────────────────────────────────────────
/**
 * Points perdus par le défenseur proportionnellement aux pertes subies.
 * Base : 1 point par unité perdue pondérée par sa puissance.
 */
function calculatePointsExchanged(defenderLosses, defenders) {
    let points = 0;
    for (const u of defenders) {
        const lost = defenderLosses[u.unitType] ?? 0;
        points += lost * Math.floor((u.attack + u.defense) / 10);
    }
    return Math.max(1, points);
}
//# sourceMappingURL=combat.formulas.js.map