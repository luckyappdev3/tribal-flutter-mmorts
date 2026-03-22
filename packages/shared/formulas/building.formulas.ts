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
    stone: Math.floor(definition.baseStats.baseCost.stone * multiplier),
    iron: Math.floor(definition.baseStats.baseCost.iron * multiplier),
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

/**
 * Calcule les points d'un village selon ses bâtiments construits.
 * Formule Tribal Wars : Σ coûts_cumulés / 1000
 *
 * @param buildings - liste des { buildingId, level } du village
 * @param gameData  - registre des définitions de bâtiments
 */
export function calculateVillagePoints(
  buildings: { buildingId: string; level: number }[],
  getBuildingDef: (id: string) => BuildingDefinition | null,
): number {
  let total = 0;

  for (const b of buildings) {
    if (b.level <= 0) continue;
    const def = getBuildingDef(b.buildingId);
    if (!def) continue;

    // Sommer les coûts de chaque niveau du 1 jusqu'au niveau actuel
    for (let lvl = 1; lvl <= b.level; lvl++) {
      const cost = calculateCostForLevel(def, lvl);
      total += (cost.wood || 0) + (cost.stone || 0) + (cost.iron || 0);
    }
  }

  // Diviser par 1000 comme dans Tribal Wars
  return Math.floor(total / 1000);
}