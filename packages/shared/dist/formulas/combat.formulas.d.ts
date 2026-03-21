import { UnitGroup } from '../schemas/unit.schema';
export type CombatResult = {
    attackerWon: boolean;
    attackerLosses: Record<string, number>;
    defenderLosses: Record<string, number>;
    lootCapacity: number;
    morale: number;
    wallBonus: number;
};
/**
 * Morale de l'attaquant selon l'écart de points.
 * Formule TW : min(1.0, 3 × pointsDéf / pointsAtk)
 * Plancher à 0.3 (jamais en-dessous de 30%).
 */
export declare function calculateMorale(attackerPoints: number, defenderPoints: number): number;
/**
 * Bonus défensif du Mur.
 * Formule : 1 + level × 0.05  (mur lvl 20 = ×2.0 défense)
 */
export declare function calculateWallBonus(wallLevel: number): number;
/**
 * Résout un combat entre attaquants et défenseurs.
 *
 * Options facultatives :
 *  - wallLevel       : niveau du mur du défenseur (0 = pas de mur)
 *  - attackerPoints  : points du joueur attaquant (pour la morale)
 *  - defenderPoints  : points du joueur défenseur (pour la morale)
 */
export declare function resolveBattle(attackers: UnitGroup[], defenders: UnitGroup[], options?: {
    wallLevel?: number;
    attackerPoints?: number;
    defenderPoints?: number;
}): CombatResult;
export type VillageResources = {
    wood: number;
    stone: number;
    iron: number;
};
export declare function calculateLoot(available: VillageResources, capacity: number): VillageResources;
export declare function calculateTravelTime(x1: number, y1: number, x2: number, y2: number, units: {
    unitType: string;
    count: number;
    speed: number;
}[]): number;
export declare function calculatePointsExchanged(defenderLosses: Record<string, number>, defenders: UnitGroup[]): number;
//# sourceMappingURL=combat.formulas.d.ts.map