"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMorale = calculateMorale;
exports.calculateWallBonus = calculateWallBonus;
exports.resolveBattle = resolveBattle;
exports.calculateLoot = calculateLoot;
exports.calculateTravelTime = calculateTravelTime;
exports.calculatePointsExchanged = calculatePointsExchanged;
/**
 * Morale de l'attaquant selon l'écart de points.
 * Formule TW : min(1.0, 3 × pointsDéf / pointsAtk)
 * Plancher à 0.3 (jamais en-dessous de 30%).
 */
function calculateMorale(attackerPoints, defenderPoints) {
    if (attackerPoints <= 0 || defenderPoints <= 0)
        return 1.0;
    const raw = (3 * defenderPoints) / attackerPoints;
    return Math.min(1.0, Math.max(0.3, raw));
}
/**
 * Bonus défensif du Mur.
 * Formule : 1 + level × 0.05  (mur lvl 20 = ×2.0 défense)
 */
function calculateWallBonus(wallLevel) {
    return 1 + Math.min(Math.max(0, wallLevel), 20) * 0.05;
}
/**
 * Résout un combat entre attaquants et défenseurs.
 *
 * Options facultatives :
 *  - wallLevel       : niveau du mur du défenseur (0 = pas de mur)
 *  - attackerPoints  : points du joueur attaquant (pour la morale)
 *  - defenderPoints  : points du joueur défenseur (pour la morale)
 */
function resolveBattle(attackers, defenders, options) {
    const wallBonus = calculateWallBonus(options?.wallLevel ?? 0);
    const morale = calculateMorale(options?.attackerPoints ?? 1, options?.defenderPoints ?? 1);
    const atkPower = attackers.reduce((s, u) => s + u.count * u.attack, 0) * morale;
    const defPower = defenders.reduce((s, u) => s + u.count * u.defense, 0) * wallBonus;
    // Village sans défenseurs → victoire sans pertes
    if (defPower === 0) {
        const loot = attackers.reduce((s, u) => s + u.count * u.carryCapacity, 0);
        return {
            attackerWon: true,
            attackerLosses: Object.fromEntries(attackers.map(u => [u.unitType, 0])),
            defenderLosses: Object.fromEntries(defenders.map(u => [u.unitType, u.count])),
            lootCapacity: loot,
            morale,
            wallBonus,
        };
    }
    const totalPower = atkPower + defPower;
    const atkRatio = atkPower / totalPower;
    const attackerWon = atkRatio > 0.5;
    const atkLossRate = attackerWon
        ? 1 - Math.pow(atkRatio, 1 / 3)
        : 1 - Math.pow(1 - atkRatio, 1 / 3);
    const defLossRate = attackerWon
        ? Math.pow(atkRatio, 1 / 3)
        : Math.pow(1 - atkRatio, 1 / 3);
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
            ? u.count
            : Math.ceil(u.count * defLossRate);
        defenderLosses[u.unitType] = Math.min(lost, u.count);
    }
    return {
        attackerWon,
        attackerLosses,
        defenderLosses,
        lootCapacity: attackerWon ? survivingCarry : 0,
        morale,
        wallBonus,
    };
}
function calculateLoot(available, capacity) {
    const total = available.wood + available.stone + available.iron;
    if (total <= 0 || capacity <= 0)
        return { wood: 0, stone: 0, iron: 0 };
    if (capacity >= total)
        return {
            wood: Math.floor(available.wood),
            stone: Math.floor(available.stone),
            iron: Math.floor(available.iron),
        };
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
function calculateTravelTime(x1, y1, x2, y2, units) {
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const slowest = Math.max(...units.map(u => u.speed));
    return Math.ceil(distance * slowest);
}
// ─────────────────────────────────────────────
// CALCUL DES POINTS
// ─────────────────────────────────────────────
function calculatePointsExchanged(defenderLosses, defenders) {
    let points = 0;
    for (const u of defenders) {
        const lost = defenderLosses[u.unitType] ?? 0;
        points += lost * Math.floor((u.attack + u.defense) / 10);
    }
    return Math.max(1, points);
}
//# sourceMappingURL=combat.formulas.js.map