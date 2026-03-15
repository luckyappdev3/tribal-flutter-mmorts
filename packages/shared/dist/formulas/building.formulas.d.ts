import { Resources } from '../schemas/resources.schema';
import { BuildingDefinition } from '../schemas/building.schema';
/**
 * Calcule les ressources nécessaires pour un niveau spécifique
 * Basé sur la formule : Base * Multiplicateur ^ (Niveau - 1)
 */
export declare function calculateCostForLevel(definition: BuildingDefinition, level: number): Resources;
/**
 * Calcule le temps de construction (en secondes) pour un niveau spécifique
 */
export declare function calculateTimeForLevel(definition: BuildingDefinition, level: number): number;
//# sourceMappingURL=building.formulas.d.ts.map