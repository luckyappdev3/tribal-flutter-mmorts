// IMPORTATION CORRIGÉE : on va chercher les types là où ils sont définis
import { Resources } from '../schemas/resources.schema';
import { BuildingDefinition } from '../schemas/building.schema';

/**
 * Calcule les ressources nécessaires pour un niveau spécifique
 * Basé sur la formule : Base * Multiplicateur ^ (Niveau - 1)
 */
export function calculateCostForLevel(definition: BuildingDefinition, level: number): Resources {
  // Niveau 1 = Coût de base direct
  if (level === 1) return definition.baseStats.baseCost;

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
export function calculateTimeForLevel(definition: BuildingDefinition, level: number): number {
  if (level === 1) return definition.baseStats.baseBuildTime;

  const multiplier = Math.pow(definition.baseStats.timeMultiplier, level - 1);
  return Math.floor(definition.baseStats.baseBuildTime * multiplier);
}