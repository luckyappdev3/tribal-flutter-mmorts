"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionFormulas = exports.calcResourceProduction = void 0;
const calcResourceProduction = (level, elapsedMs) => {
    const hourlyRate = level === 0 ? 5 : Math.round(3600 * Math.pow(1.3, level - 1));
    return (hourlyRate / 3600000) * elapsedMs;
};
exports.calcResourceProduction = calcResourceProduction;
// Garde ProductionFormulas si tu l'utilises ailleurs côté mobile
exports.ProductionFormulas = {
    getHourlyRate: (level) => {
        if (level === 0)
            return 5;
        return Math.round(3600 * Math.pow(1.3, level - 1));
    },
    calculateGain: exports.calcResourceProduction,
};
//# sourceMappingURL=production.formulas.js.map