import { calcWallBonus } from './production.formulas';
import { UnitGroup } from '../schemas/unit.schema';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export { UnitGroup };

export type CombatResult = {
  attackerWon:    boolean;
  attackerLosses: Record<string, number>;
  defenderLosses: Record<string, number>;
  lootCapacity:   number;
  morale:         number;  // 0.3 → 1.0
  wallBonus:      number;  // 1.0 → 2.07
};

// ─────────────────────────────────────────────────────────────
// MORALE
// Formule TW : min(1.0, 3 × points_défenseur / points_attaquant)
// Plancher à 0.3 (jamais en-dessous de 30%)
// Pas de malus si l'un des deux est à 0 points
// ─────────────────────────────────────────────────────────────

export function calculateMorale(
  attackerPoints: number,
  defenderPoints: number,
): number {
  if (attackerPoints <= 0 || defenderPoints <= 0) return 1.0;
  const raw = (3 * defenderPoints) / attackerPoints;
  return Math.min(1.0, Math.max(0.3, raw));
}

// ─────────────────────────────────────────────────────────────
// RÉSOLUTION DU COMBAT
// ─────────────────────────────────────────────────────────────

export function resolveBattle(
  attackers: UnitGroup[],
  defenders: UnitGroup[],
  options?: {
    wallLevel?:      number;
    attackerPoints?: number;
    defenderPoints?: number;
  },
): CombatResult {
  // Bonus mur TW : 1.037^wallLevel
  const wallBonus = calcWallBonus(options?.wallLevel ?? 0);

  // Morale
  const morale = calculateMorale(
    options?.attackerPoints ?? 1,
    options?.defenderPoints ?? 1,
  );

  // Puissance totale avec modificateurs
  const atkPower = attackers.reduce((s, u) => s + u.count * u.attack,   0) * morale;
  const defPower = defenders.reduce((s, u) => s + u.count * u.defense,  0) * wallBonus;

  const attackerWon = atkPower > defPower;

  // ── Calcul des pertes (formule TW) ──────────────────────────
  // ratio = puissance_perdant / puissance_gagnant
  // pertes_perdant% = ratio^(ratio+1) — pertes importantes si très inférieur
  // pertes_gagnant% = ratio^(1/(ratio+1)) — pertes légères si très supérieur

  const attackerLosses: Record<string, number> = {};
  const defenderLosses: Record<string, number> = {};

  if (atkPower === 0 && defPower === 0) {
    // Aucune troupe des deux côtés
  } else if (defPower === 0) {
    // Défenseur sans troupes : zéro pertes attaquant
    for (const u of attackers) attackerLosses[u.unitType] = 0;
    for (const u of defenders) defenderLosses[u.unitType] = u.count;
  } else if (atkPower === 0) {
    // Attaquant sans troupes
    for (const u of attackers) attackerLosses[u.unitType] = u.count;
    for (const u of defenders) defenderLosses[u.unitType] = 0;
  } else {
    const ratio = attackerWon
      ? defPower  / atkPower   // ratio < 1 si attaquant gagne
      : atkPower  / defPower;  // ratio < 1 si défenseur gagne

    const loserPct  = Math.pow(ratio, ratio + 1);
    const winnerPct = Math.pow(ratio, 1 / (ratio + 1));

    if (attackerWon) {
      // Attaquant gagne → défenseur perd plus
      for (const u of defenders) {
        defenderLosses[u.unitType] = Math.ceil(u.count * loserPct);
      }
      for (const u of attackers) {
        attackerLosses[u.unitType] = Math.ceil(u.count * winnerPct);
      }
    } else {
      // Défenseur gagne → attaquant perd plus
      for (const u of attackers) {
        attackerLosses[u.unitType] = Math.ceil(u.count * loserPct);
      }
      for (const u of defenders) {
        defenderLosses[u.unitType] = Math.ceil(u.count * winnerPct);
      }
    }

    // Clamp : pas plus de pertes que de troupes
    for (const u of attackers) {
      attackerLosses[u.unitType] = Math.min(attackerLosses[u.unitType] ?? 0, u.count);
    }
    for (const u of defenders) {
      defenderLosses[u.unitType] = Math.min(defenderLosses[u.unitType] ?? 0, u.count);
    }
  }

  // ── Capacité de pillage des survivants ──────────────────────
  const lootCapacity = attackers.reduce((s, u) => {
    const lost     = attackerLosses[u.unitType] ?? 0;
    const survived = Math.max(0, u.count - lost);
    return s + survived * u.carryCapacity;
  }, 0);

  return { attackerWon, attackerLosses, defenderLosses, lootCapacity, morale, wallBonus };
}

// ─────────────────────────────────────────────────────────────
// PILLAGE
// ─────────────────────────────────────────────────────────────

export function calculateLoot(
  resources: { wood: number; stone: number; iron: number },
  capacity:  number,
): { wood: number; stone: number; iron: number } {
  const total = resources.wood + resources.stone + resources.iron;
  if (total === 0 || capacity === 0) return { wood: 0, stone: 0, iron: 0 };

  if (total <= capacity) return { ...resources };

  const ratio = capacity / total;
  return {
    wood:  Math.floor(resources.wood  * ratio),
    stone: Math.floor(resources.stone * ratio),
    iron:  Math.floor(resources.iron  * ratio),
  };
}

// ─────────────────────────────────────────────────────────────
// TEMPS DE TRAJET
// vitesse en secondes/case → plus petit = plus rapide
// ─────────────────────────────────────────────────────────────

export function calculateTravelTime(
  x1: number, y1: number,
  x2: number, y2: number,
  unitSpeed: number,   // secondes par case
  gameSpeed: number,   // multiplicateur monde (1 = normal)
): number {
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return Math.max(1, Math.round((distance * unitSpeed) / gameSpeed));
}