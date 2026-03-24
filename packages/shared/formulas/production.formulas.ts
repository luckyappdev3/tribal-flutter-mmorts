// ─────────────────────────────────────────────────────────────
// FORMULES DE PRODUCTION — Valeurs Tribal Wars officielles
// ─────────────────────────────────────────────────────────────

/**
 * Taux de production horaire d'une mine/camp/carrière selon son niveau.
 * Formule TW : prod_base=30, prod_factor=1.155
 * Niv 1 = 30/h, Niv 10 ≈ 120/h, Niv 20 ≈ 460/h, Niv 30 ≈ 2028/h
 */
export function getHourlyProductionRate(level: number): number {
  if (level <= 0) return 5; // production minimale même sans bâtiment
  return Math.floor(30 * Math.pow(1.155, level - 1));
}

/**
 * Ressources produites sur une durée donnée.
 */
export const calcResourceProduction = (level: number, elapsedMs: number): number => {
  const hourlyRate = getHourlyProductionRate(level);
  return (hourlyRate / 3_600_000) * elapsedMs;
};

/**
 * Capacité de stockage selon le niveau de l'entrepôt.
 * Formule TW : cap_base=1000, cap_factor=1.2295
 * Niv 1 = 1 000, Niv 10 ≈ 7 600, Niv 20 ≈ 57 000, Niv 30 ≈ 400 000
 */
export function calcMaxStorage(level: number): number {
  if (level <= 0) return 1_000; // stockage de base sans entrepôt
  return Math.floor(1_000 * Math.pow(1.2295, level - 1));
}

/**
 * Population maximale selon le niveau de la Ferme.
 * Table exacte Tribal Wars : Niv 1 = 240, Niv 30 = 24 000
 */
const _FARM_CAPACITY = [240,281,329,386,452,530,622,729,854,1002,1174,1376,1613,1891,2216,2598,3045,3569,4183,4903,5747,6737,7896,9255,10848,12715,14904,17469,20476,24000];

export function calcMaxPopulation(farmLevel: number): number {
  if (farmLevel <= 0) return 0;
  return _FARM_CAPACITY[farmLevel - 1] ?? 0;
}

/**
 * Bonus défensif du mur.
 * Formule TW : def_bonus_per_level = 1.037
 * Niv 0 = ×1.0, Niv 10 = ×1.44, Niv 20 = ×2.07
 */
export function calcWallBonus(wallLevel: number): number {
  if (wallLevel <= 0) return 1.0;
  return Math.pow(1.037, Math.min(wallLevel, 20));
}

// Alias rétrocompatibilité (utilisé dans village.controller.ts et ailleurs)
export const ProductionFormulas = {
  getHourlyRate: getHourlyProductionRate,
  calculateGain: calcResourceProduction,
};
