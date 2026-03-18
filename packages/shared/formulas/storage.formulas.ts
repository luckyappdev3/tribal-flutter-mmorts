/**
 * Calcule la capacité maximale de l'entrepôt selon son niveau.
 */
export const calcMaxStorage = (level: number): number => {
  if (level === 0) return 5000;   // Pas d'entrepôt = stock de base
  return Math.round(5000 * Math.pow(1.5, level - 1)); // Niv 1 = 5000, Niv 2 = 7500...
};

/**
 * Calcule les ressources protégées (Cachette)
 */
export const calcProtectedResources = (level: number): number => {
  return level * 100; // Exemple simple : 100 par niveau
};