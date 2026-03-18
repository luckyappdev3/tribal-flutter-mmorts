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
 * - Si ratio > 0.5 : attaquant gagne
 * - Pertes attaquant = (1 - ratio^(1/3)) × count  (les gagnants perdent moins)
 * - Pertes défenseur = ratio^(1/3) × count         (les perdants perdent plus)
 */
export declare function resolveBattle(attackers: UnitGroup[], defenders: UnitGroup[]): CombatResult;
export type VillageResources = {
    wood: number;
    stone: number;
    iron: number;
};
/**
 * Calcule les ressources pillées selon la capacité de transport.
 * Répartition équitable entre les 3 ressources.
 */
export declare function calculateLoot(available: VillageResources, capacity: number): VillageResources;
/**
 * Calcule le temps de trajet en secondes.
 * Vitesse = unité la plus lente de l'armée.
 * Distance = Pythagore entre les deux villages.
 * 1 case = speed secondes pour l'unité la plus lente.
 */
export declare function calculateTravelTime(x1: number, y1: number, x2: number, y2: number, units: {
    unitType: string;
    count: number;
    speed: number;
}[]): number;
/**
 * Points perdus par le défenseur proportionnellement aux pertes subies.
 * Base : 1 point par unité perdue pondérée par sa puissance.
 */
export declare function calculatePointsExchanged(defenderLosses: Record<string, number>, defenders: UnitGroup[]): number;
//# sourceMappingURL=combat.formulas.d.ts.map