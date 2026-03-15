/**
 * Calcule la production de ressources.
 * Intègre la logique de niveau et la progression temporelle.
 */
export const ProductionFormulas = {
  /**
   * Calcule la production horaire (Points de structure)
   * Formule type : Base * (Multiplier ^ (Level - 1))
   */
  getHourlyRate: (level: number, baseProd: number = 30, multiplier: number = 1.2): number => {
    if (level === 0) return 5; // Production de base si bâtiment non construit ou niveau 0
    return Math.round(baseProd * Math.pow(multiplier, level - 1));
  },

  /**
   * Calcule le gain de ressources pour un intervalle de temps donné.
   * Utile pour le serveur (Ticks) et le client (Interpolation visuelle).
   * * @param level Niveau du bâtiment
   * @param elapsedMs Temps écoulé en millisecondes depuis le dernier tick
   */
  calculateGain: (level: number, elapsedMs: number): number => {
    const hourlyRate = ProductionFormulas.getHourlyRate(level);
    // (Gain horaire / 3600 secondes / 1000 ms) * temps écoulé
    return (hourlyRate / 3600000) * elapsedMs;
  }
};