// Ré-exporte depuis production.formulas pour rétrocompatibilité
// calcMaxStorage est maintenant la source de vérité dans production.formulas.ts
export { calcMaxStorage } from './production.formulas';

/**
 * Calcule les ressources protégées (Cachette) — pas encore implémenté
 */
export const calcProtectedResources = (level: number): number => {
  return level * 100;
};
