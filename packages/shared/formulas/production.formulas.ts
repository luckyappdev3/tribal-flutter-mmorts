export const calcResourceProduction = (level: number, elapsedMs: number): number => {
  const hourlyRate = level === 0 ? 5 : Math.round(3600 * Math.pow(1.3, level - 1));
  return (hourlyRate / 3600000) * elapsedMs;
};

// Garde ProductionFormulas si tu l'utilises ailleurs côté mobile
export const ProductionFormulas = {
  getHourlyRate: (level: number): number => {
    if (level === 0) return 5;
    return Math.round(3600 * Math.pow(1.3, level - 1));
  },
  calculateGain: calcResourceProduction,
};