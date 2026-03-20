import { UnitGroup } from '../schemas/unit.schema';

// ─────────────────────────────────────────────
// RÉSOLUTION D'UN COMBAT (style Tribal Wars)
// ─────────────────────────────────────────────

export type CombatResult = {
  attackerWon:    boolean;
  attackerLosses: Record<string, number>;
  defenderLosses: Record<string, number>;
  lootCapacity:   number;
};

/**
 * Résout un combat entre attaquants et défenseurs.
 *
 * Formule Tribal Wars :
 * - Ratio = atkPower / (atkPower + defPower)
 * - Pertes basées sur le ratio avec Math.ceil
 * - Victoire déterminée par les survivants réels (pas seulement le ratio)
 *   → Si tous les défenseurs meurent et qu'il reste des attaquants : victoire attaquant
 *   → Si tous les attaquants meurent et qu'il reste des défenseurs : victoire défenseur
 */
export function resolveBattle(
  attackers: UnitGroup[],
  defenders: UnitGroup[],
): CombatResult {
  const atkPower = attackers.reduce((s, u) => s + u.count * u.attack,  0);
  const defPower = defenders.reduce((s, u) => s + u.count * u.defense, 0);

  // Village vide → victoire sans pertes
  if (defPower === 0) {
    const loot = attackers.reduce((s, u) => s + u.count * u.carryCapacity, 0);
    return {
      attackerWon:    true,
      attackerLosses: Object.fromEntries(attackers.map(u => [u.unitType, 0])),
      defenderLosses: Object.fromEntries(defenders.map(u => [u.unitType, u.count])),
      lootCapacity:   loot,
    };
  }

  const totalPower = atkPower + defPower;
  const atkRatio   = atkPower / totalPower;

  // Taux de pertes basés sur le ratio
  const atkLossRateIfWin  = 1 - Math.pow(atkRatio, 1 / 3);
  const atkLossRateIfLose = 1 - Math.pow(1 - atkRatio, 1 / 3);
  const defLossRateIfWin  = Math.pow(atkRatio, 1 / 3);
  const defLossRateIfLose = Math.pow(1 - atkRatio, 1 / 3);

  // Calculer les pertes des attaquants selon les deux scénarios
  const calcLosses = (units: UnitGroup[], lossRate: number) => {
    const losses: Record<string, number> = {};
    let survivors = 0;
    for (const u of units) {
      const lost     = Math.min(Math.ceil(u.count * lossRate), u.count);
      const survived = u.count - lost;
      losses[u.unitType] = lost;
      survivors += survived;
    }
    return { losses, survivors };
  };

  // Simuler victoire attaquant
  const atkWinScenario = calcLosses(attackers, atkLossRateIfWin);
  const defLoseScenario = calcLosses(defenders, defLossRateIfWin);

  // Simuler victoire défenseur
  const atkLoseScenario = calcLosses(attackers, atkLossRateIfLose);
  const defWinScenario  = calcLosses(defenders, defLossRateIfLose);

  // Déterminer le vrai résultat basé sur les survivants réels
  // → L'attaquant gagne si au moins 1 survivant ET tous défenseurs morts
  // → Le défenseur gagne si au moins 1 défenseur survit OU tous attaquants morts
  let attackerWon: boolean;
  let attackerLosses: Record<string, number>;
  let defenderLosses: Record<string, number>;
  let survivingCarry = 0;

  if (atkRatio >= 0.5) {
    // Scénario initial : attaquant devrait gagner
    attackerLosses = atkWinScenario.losses;
    defenderLosses = defLoseScenario.losses;

    const atkSurvivors = atkWinScenario.survivors;
    const defSurvivors = defLoseScenario.survivors;

    // Vrai résultat : si le défenseur a des survivants, il résiste
    if (defSurvivors > 0 && atkSurvivors === 0) {
      attackerWon = false;
    } else if (atkSurvivors > 0 && defSurvivors === 0) {
      attackerWon = true;
    } else {
      attackerWon = atkSurvivors > 0; // Attaquant gagne s'il a des survivants
    }
  } else {
    // Scénario initial : défenseur devrait gagner
    attackerLosses = atkLoseScenario.losses;
    defenderLosses = defWinScenario.losses;

    const atkSurvivors = atkLoseScenario.survivors;
    const defSurvivors = defWinScenario.survivors;

    // Vrai résultat : si tous défenseurs sont morts malgré le ratio, attaquant gagne
    if (defSurvivors === 0 && atkSurvivors > 0) {
      attackerWon = true;
    } else if (atkSurvivors === 0) {
      attackerWon = false;
    } else {
      attackerWon = false; // Défenseur gagne si ratio en sa faveur et survivants
    }
  }

  // Capacité de transport des survivants attaquants
  if (attackerWon) {
    for (const u of attackers) {
      const lost     = attackerLosses[u.unitType] ?? 0;
      const survived = u.count - lost;
      survivingCarry += survived * u.carryCapacity;
    }
  }

  return {
    attackerWon,
    attackerLosses,
    defenderLosses,
    lootCapacity: attackerWon ? survivingCarry : 0,
  };
}

// ─────────────────────────────────────────────
// CALCUL DU PILLAGE
// ─────────────────────────────────────────────

export type VillageResources = {
  wood:  number;
  stone: number;
  iron:  number;
};

/**
 * Calcule les ressources pillées selon la capacité de transport.
 * Répartition proportionnelle avec redistribution des arrondis
 * pour utiliser exactement la capacité disponible.
 */
export function calculateLoot(
  available: VillageResources,
  capacity:  number,
): VillageResources {
  const total = available.wood + available.stone + available.iron;

  if (total <= 0 || capacity <= 0) {
    return { wood: 0, stone: 0, iron: 0 };
  }

  if (capacity >= total) {
    return {
      wood:  Math.floor(available.wood),
      stone: Math.floor(available.stone),
      iron:  Math.floor(available.iron),
    };
  }

  const ratio = capacity / total;
  let wood  = Math.floor(available.wood  * ratio);
  let stone = Math.floor(available.stone * ratio);
  let iron  = Math.floor(available.iron  * ratio);

  // Redistribuer les unités perdues aux arrondis
  let remainder = capacity - (wood + stone + iron);
  const slots = [
    { key: 'wood',  avail: Math.floor(available.wood)  - wood  },
    { key: 'stone', avail: Math.floor(available.stone) - stone },
    { key: 'iron',  avail: Math.floor(available.iron)  - iron  },
  ].sort((a, b) => b.avail - a.avail);

  for (const slot of slots) {
    if (remainder <= 0) break;
    const add = Math.min(remainder, slot.avail);
    if (slot.key === 'wood')  wood  += add;
    if (slot.key === 'stone') stone += add;
    if (slot.key === 'iron')  iron  += add;
    remainder -= add;
  }

  return { wood, stone, iron };
}

// ─────────────────────────────────────────────
// CALCUL DU TEMPS DE TRAJET
// ─────────────────────────────────────────────

export function calculateTravelTime(
  x1: number, y1: number,
  x2: number, y2: number,
  units: { unitType: string; count: number; speed: number }[],
): number {
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const slowest  = Math.max(...units.map(u => u.speed));
  return Math.ceil(distance * slowest);
}

// ─────────────────────────────────────────────
// CALCUL DES POINTS PERDUS/GAGNÉS
// ─────────────────────────────────────────────

export function calculatePointsExchanged(
  defenderLosses: Record<string, number>,
  defenders: UnitGroup[],
): number {
  let points = 0;
  for (const u of defenders) {
    const lost = defenderLosses[u.unitType] ?? 0;
    points += lost * Math.floor((u.attack + u.defense) / 10);
  }
  return Math.max(1, points);
}
