/**
 * Calcule la capacité maximale de l'entrepôt selon son niveau.
 */
export const calcMaxStorage = (level: number): number => {
  if (level <= 1) return 1000;
  // Progression exponentielle : environ +20% par niveau
  return Math.round(1000 * Math.pow(1.2, level - 1));
};

/**
 * Calcule les ressources protégées (Cachette)
 */
export const calcProtectedResources = (level: number): number => {
  return level * 100; // Exemple simple : 100 par niveau
};