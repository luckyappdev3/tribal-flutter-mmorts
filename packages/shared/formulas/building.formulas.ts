// IMPORTATION CORRIGÉE : on va chercher les types là où ils sont définis
import { Resources } from '../schemas/resources.schema';
import { BuildingDefinition } from '../schemas/building.schema';

// ─────────────────────────────────────────────────────────────
//  CONSOMMATION DE POPULATION PAR BÂTIMENT
//  Tables de valeurs exactes (source : données Tribal Wars)
//  Index 0 = niveau 1, index n-1 = niveau n
// ─────────────────────────────────────────────────────────────

export const BUILDING_POP_LEVELS: Record<string, number[]> = {
  // ── Militaire ──────────────────────────────────────────────
  headquarters: [5,1,1,1,1,2,2,2,2,3,3,4,4,5,6,6,8,9,10,12,14,16,18,21,25,29,33,38,44,51],
  barracks:     [7,1,1,2,2,2,2,3,3,3,5,4,6,6,7,9,9,11,13,15,17,19,23,26,31],
  stable:       [8,1,2,2,2,2,3,3,3,5,4,6,6,7,9,9,11,13,15,17],
  garage:       [8,1,2,2,2,2,3,3,3,5,4,6,6,7,9],
  snob:         [80,20,20],
  smith:        [20,3,4,4,4,6,6,7,9,9,11,13,15,17,19,23,26,31,35,40],
  statue:       [10],
  wall:         [5,1,1,1,1,2,2,2,2,3,3,4,4,5,6,6,8,9,10,12],
  // ── Économie ───────────────────────────────────────────────
  market:       [20,3,4,4,4,6,6,7,9,9,11,13,15,17,19,23,26,31,35,40,47,54,63,72,83],
  timber_camp:  [5,1,1,1,1,1,2,2,2,2,3,3,4,5,5,5,7,8,9,10,12,14,16,19,21,25,29,33,38,44],
  quarry:       [10,2,2,2,2,3,3,4,5,5,5,7,8,9,10,12,14,16,19,21,25,29,33,38,44,51,59,69,79,91],
  iron_mine:    [15,3,3,3,4,5,5,5,7,8,9,10,12,14,16,19,21,25,29,33,38,44,51,59,69,79,91,105,121,140],
  // ── Aucune consommation de population ──────────────────────
  rally_point:  [0],
  farm:         Array(30).fill(0),
  warehouse:    Array(30).fill(0),
  hiding_spot:  [2,0,0,0,0,0,0,0,0,0],
};

// ─────────────────────────────────────────────────────────────
//  CAPACITÉ FERME — table exacte (index 0 = niveau 1)
// ─────────────────────────────────────────────────────────────
export const FARM_CAPACITY = [240,281,329,386,452,530,622,729,854,1002,1174,1376,1613,1891,2216,2598,3045,3569,4183,4903,5747,6737,7896,9255,10848,12715,14904,17469,20476,24000];

/**
 * Population consommée par un bâtiment au niveau n.
 * Utilise des tables de valeurs exactes issues des données Tribal Wars.
 * Retourne 0 pour les bâtiments sans consommation (ferme, entrepôt, etc.)
 */
export function calcBuildingPopCost(buildingId: string, level: number): number {
  if (level <= 0) return 0;
  const table = BUILDING_POP_LEVELS[buildingId];
  if (!table) return 0;
  return table[level - 1] ?? 0;
}

/**
 * Population totale cumulée d'un bâtiment à un niveau donné.
 * Exemple : caserne niv 3 = P(1) + P(2) + P(3) = 7 + 8 + 10 = 25
 */
export function calcBuildingCumulativePop(buildingId: string, level: number): number {
  let total = 0;
  for (let l = 1; l <= level; l++) {
    total += calcBuildingPopCost(buildingId, l);
  }
  return total;
}

/**
 * Population totale consommée par l'ensemble des bâtiments d'un village.
 * Chaque bâtiment contribue la somme de ses coûts de niveau 1 à niveau actuel.
 */
export function calcTotalPopUsed(
  buildings: { buildingId: string; level: number }[],
): number {
  return buildings.reduce(
    (sum, b) => sum + calcBuildingCumulativePop(b.buildingId, b.level),
    0,
  );
}

/**
 * Population libre d'un village (popMax - popUsed des bâtiments).
 * Inline la formule Ferme pour éviter la dépendance croisée entre fichiers de formules.
 */
export function calcPopFree(
  buildings: { buildingId: string; level: number }[],
): number {
  const farmLevel = buildings.find(b => b.buildingId === 'farm')?.level ?? 1;
  const popMax    = FARM_CAPACITY[farmLevel - 1] ?? 0;
  const popUsed   = calcTotalPopUsed(buildings);
  return popMax - popUsed;
}

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