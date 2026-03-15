import { z } from 'zod';

// --- TYPES DE BÂTIMENTS ---
export const BUILDING_TYPES = [
  'headquarters',
  'woodcutter', // Scierie (Bois)
  'quarry',     // Carrière (Pierre)
  'iron_mine',  // Mine (Fer)
  'warehouse',
  'farm'
] as const;

export type BuildingType = typeof BUILDING_TYPES[number];

// --- SCHÉMAS DE VALIDATION (Zod) ---
// Aligné sur ton schéma Prisma (wood, stone, iron)
export const ResourcesSchema = z.object({
  wood: z.number().nonnegative(),
  stone: z.number().nonnegative(),
  iron: z.number().nonnegative(),
});

// --- CONSTANTES ÉCONOMIQUES ---
export const GAME_CONFIG = {
  PROD_BASE: 30, // Production par heure au niveau 1
  PROD_EXPONENT: 1.5,
  STORAGE_BASE: 1000,
  STORAGE_EXPONENT: 1.2,
};

// --- LOGIQUE PARTAGÉE (Formules) ---
export const GameFormulas = {
  /**
   * Calculer la production horaire théorique selon le niveau
   */
  calculateHourlyProduction: (level: number): number => {
    if (level === 0) return 5; 
    return Math.round(GAME_CONFIG.PROD_BASE * Math.pow(GAME_CONFIG.PROD_EXPONENT, level - 1));
  },

  /**
   * Calculer le gain de ressources pour un intervalle de temps donné
   * Cette formule est celle utilisée par le EconomyService (Server)
   */
  calcResourceProduction: (level: number, elapsedMs: number): number => {
    const hourlyProd = GameFormulas.calculateHourlyProduction(level);
    // (Prod / 3600000 ms) * temps écoulé
    return (hourlyProd / 3600000) * elapsedMs;
  },
  
  calculateStorage: (level: number) => {
    return Math.round(GAME_CONFIG.STORAGE_BASE * Math.pow(GAME_CONFIG.STORAGE_EXPONENT, level - 1));
  }
};

// Export individuel pour faciliter l'import dans le serveur
export const calcResourceProduction = GameFormulas.calcResourceProduction;