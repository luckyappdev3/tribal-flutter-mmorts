import { UnitGroup } from '../schemas/unit.schema';
export type CombatResult = {
    attackerWon: boolean;
    attackerLosses: Record<string, number>;
    defenderLosses: Record<string, number>;
    lootCapacity: number;
};
/**
 * Résout un combat entre attaquants et défenseurs.
 *
 * Formule Tribal Wars :
 * - Ratio = atkPower / (atkPower + defPower)
 * - Pertes basées sur le ratio avec Math.ceil
 * - Victoire déterminée par les survivants réels (pas seulement le ratio)
 *   → Si tous les défenseurs meurent et qu'il reste des attaquants : victoire attaquant
 *   → Si tous les attaquants meurent et qu'il reste des défenseurs : victoire défenseur
 */
export declare function resolveBattle(attackers: UnitGroup[], defenders: UnitGroup[]): CombatResult;
export type VillageResources = {
    wood: number;
    stone: number;
    iron: number;
};
/**
 * Calcule les ressources pillées selon la capacité de transport.
 * Répartition proportionnelle avec redistribution des arrondis
 * pour utiliser exactement la capacité disponible.
 */
export declare function calculateLoot(available: VillageResources, capacity: number): VillageResources;
export declare function calculateTravelTime(x1: number, y1: number, x2: number, y2: number, units: {
    unitType: string;
    count: number;
    speed: number;
}[]): number;
export declare function calculatePointsExchanged(defenderLosses: Record<string, number>, defenders: UnitGroup[]): number;
//# sourceMappingURL=combat.formulas.d.ts.map