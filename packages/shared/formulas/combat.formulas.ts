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
  effectiveWallLevel: number; // après réduction par les béliers
};

// ─────────────────────────────────────────────────────────────
// MORALE
// Formule TW : min(1.0, 3 × points_défenseur / points_attaquant)
// Plancher à 0.3, pas de malus si l'un des deux est à 0 points
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
//
// 1) Les Béliers frappent en premier et abaissent virtuellement
//    le niveau du mur (20 béliers = −1 niveau).
//
// 2) Pondération de la défense selon la composition de l'attaque :
//    Si l'attaque est X% infanterie, Y% cavalerie, Z% archers :
//      défense_pondérée = DEF_GEN × ratioInf + DEF_CAV × ratioCav + DEF_ARC × ratioArc
//    (infanterie inclut siège, héros, conquête)
//
// 3) Loi des puissances (formule TW officielle) :
//    - Le gagnant perd : (puissance_perdant / puissance_gagnant)^1.5
//    - Le perdant perd : 100% de ses troupes
// ─────────────────────────────────────────────────────────────

export function resolveBattle(
  attackers: UnitGroup[],
  defenders: UnitGroup[],
  options?: {
    wallLevel?:      number;
    ramCount?:       number;   // béliers dans l'armée attaquante
    attackerPoints?: number;
    defenderPoints?: number;
  },
): CombatResult {

  // ── 1. Réduction du mur par les béliers (pré-combat) ────────
  // Formule : max(floor(niveau/2), niveau - floor(béliers/20))
  // Les béliers frappent qu'ils survivent ou non (pré-phase).
  const baseWallLevel = options?.wallLevel ?? 0;
  const wallDamageByRams = Math.floor((options?.ramCount ?? 0) / 20);
  const effectiveWallLevel = Math.max(
    Math.floor(baseWallLevel / 2),
    Math.max(0, baseWallLevel - wallDamageByRams),
  );
  const wallBonus = calcWallBonus(effectiveWallLevel);

  // ── 2. Morale ────────────────────────────────────────────────
  const morale = calculateMorale(
    options?.attackerPoints ?? 1,
    options?.defenderPoints ?? 1,
  );

  // ── 3. Composition de l'attaque (pondération défense) ────────
  // Catégories : infantry+siege+hero+conquest → ratio infra
  //              cavalry                       → ratio cav
  //              archer                        → ratio arc
  const cavCategories = new Set(['cavalry']);
  const arcCategories = new Set(['archer']);

  let infantryPow = 0;
  let cavalryPow  = 0;
  let archerPow   = 0;

  for (const u of attackers) {
    const power = u.count * u.attack;
    if (cavCategories.has(u.category))      cavalryPow  += power;
    else if (arcCategories.has(u.category)) archerPow   += power;
    else                                     infantryPow += power;
  }

  const totalAtkPow = infantryPow + cavalryPow + archerPow;

  let ratioInf = 1 / 3;
  let ratioCav = 1 / 3;
  let ratioArc = 1 / 3;

  if (totalAtkPow > 0) {
    ratioInf = infantryPow / totalAtkPow;
    ratioCav = cavalryPow  / totalAtkPow;
    ratioArc = archerPow   / totalAtkPow;
  }

  // ── 4. Puissance totale ──────────────────────────────────────
  const atkPower = totalAtkPow * morale;

  const defPower = defenders.reduce((s, u) => {
    const weightedDef = u.defenseGeneral  * ratioInf
                      + u.defenseCavalry  * ratioCav
                      + u.defenseArcher   * ratioArc;
    return s + u.count * weightedDef;
  }, 0) * wallBonus;

  const attackerWon = atkPower > defPower;

  // ── 5. Calcul des pertes ─────────────────────────────────────
  // Gagnant perd : (puissance_perdant / puissance_gagnant)^1.5
  // Perdant perd : 100%

  const attackerLosses: Record<string, number> = {};
  const defenderLosses: Record<string, number> = {};

  if (atkPower === 0 && defPower === 0) {
    // Aucune troupe des deux côtés
    for (const u of attackers) attackerLosses[u.unitType] = 0;
    for (const u of defenders) defenderLosses[u.unitType] = 0;
  } else if (defPower === 0) {
    // Défenseur sans troupes : 0 pertes attaquant, défenseur détruit
    for (const u of attackers) attackerLosses[u.unitType] = 0;
    for (const u of defenders) defenderLosses[u.unitType] = u.count;
  } else if (atkPower === 0) {
    // Attaquant sans troupes : attaquant détruit, 0 pertes défenseur
    for (const u of attackers) attackerLosses[u.unitType] = u.count;
    for (const u of defenders) defenderLosses[u.unitType] = 0;
  } else {
    const winnerPow = Math.max(atkPower, defPower);
    const loserPow  = Math.min(atkPower, defPower);
    const winnerPct = Math.pow(loserPow / winnerPow, 1.5); // < 1

    if (attackerWon) {
      // Perdant = défenseur (100%)
      for (const u of defenders) defenderLosses[u.unitType] = u.count;
      // Gagnant = attaquant (winnerPct%) — TW utilise round, pas ceil
      for (const u of attackers) {
        attackerLosses[u.unitType] = Math.min(u.count, Math.round(u.count * winnerPct));
      }
    } else {
      // Perdant = attaquant (100%)
      for (const u of attackers) attackerLosses[u.unitType] = u.count;
      // Gagnant = défenseur (winnerPct%) — TW utilise round, pas ceil
      for (const u of defenders) {
        defenderLosses[u.unitType] = Math.min(u.count, Math.round(u.count * winnerPct));
      }
    }
  }

  // ── 6. Capacité de pillage des survivants ───────────────────
  const lootCapacity = attackers.reduce((s, u) => {
    const lost     = attackerLosses[u.unitType] ?? 0;
    const survived = Math.max(0, u.count - lost);
    return s + survived * u.carryCapacity;
  }, 0);

  return {
    attackerWon,
    attackerLosses,
    defenderLosses,
    lootCapacity,
    morale,
    wallBonus,
    effectiveWallLevel,
  };
}

// ─────────────────────────────────────────────────────────────
// PILLAGE
// ─────────────────────────────────────────────────────────────

export function calculateLoot(
  resources: { wood: number; stone: number; iron: number },
  capacity:  number,
): { wood: number; stone: number; iron: number } {
  // Floor resources first so the result is always integers (avoids
  // truncation issues when the caller parses float DB values back to int).
  type ResKey = 'wood' | 'stone' | 'iron';
  const avail: Record<ResKey, number> = {
    wood:  Math.floor(resources.wood),
    stone: Math.floor(resources.stone),
    iron:  Math.floor(resources.iron),
  };
  const intCapacity = Math.floor(capacity);
  const total = avail.wood + avail.stone + avail.iron;
  if (total === 0 || intCapacity === 0) return { wood: 0, stone: 0, iron: 0 };
  if (total <= intCapacity) return { ...avail };

  // Distribute equally (33% each). If a resource has less than its share,
  // take all of it and redistribute the leftover capacity to the others.
  // Use exact integer allocation so the full capacity is always reached.
  const result: Record<ResKey, number> = { wood: 0, stone: 0, iron: 0 };
  const active = new Set<ResKey>(['wood', 'stone', 'iron']);
  let remaining = intCapacity;

  while (remaining > 0 && active.size > 0) {
    const share = remaining / active.size;
    let anyExhausted = false;

    for (const key of active) {
      if (avail[key] <= share) {
        result[key] += avail[key];
        remaining   -= avail[key];
        avail[key]   = 0;
        active.delete(key);
        anyExhausted = true;
      }
    }

    if (!anyExhausted) {
      // All remaining resources have more than their equal share.
      // Distribute remaining capacity as evenly as possible (no Math.floor waste).
      const perType = Math.floor(remaining / active.size);
      let leftover  = remaining - perType * active.size;
      for (const key of active) {
        result[key] += perType + (leftover > 0 ? 1 : 0);
        if (leftover > 0) leftover--;
      }
      remaining = 0;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// ESPIONNAGE (Éclaireurs)
//
// Règles :
//   - Seuls les éclaireurs s'affrontent. Les autres unités présentes
//     dans le village défenseur n'interviennent pas.
//
// Formule des pertes attaquant (courbe de puissance) :
//     tauxPertes = min(1.0,  2 × (scoutsDef / scoutsAtt)²)
//
//   Intuition mathématique :
//   - Le facteur 2 signifie qu'il faut être ≥ √(1/2) ≈ 0.707× plus
//     nombreux que le défenseur pour survivre (seuil tauxPertes < 1).
//   - L'exposant ² crée une courbe non-linéaire : dépasser légèrement
//     le défenseur suffit à réduire drastiquement les pertes, mais être
//     en sous-nombre les fait exploser (pente raide).
//   Exemples :
//   - 10 att vs 0 def   → 0% pertes  (infiltration parfaite)
//   - 10 att vs 5 def   → 50% pertes (ratio 0.5 → 2×0.25 = 0.5)
//   - 10 att vs 7 def   → 98% pertes (ratio 0.7 → 2×0.49 ≈ 0.98)
//   - 10 att vs 8 def   → 100% pertes→ échec total
//
// Pertes défenseur (formule symétrique) :
//     tauxPertesDef = min(1.0,  2 × (scoutsAtt / scoutsDef)²)
//
// Paliers d'information (ratio = scoutsSurvived / scoutsSent) :
//   > 0%  (tier 1) → ressources + troupes stationnées
//   > 50% (tier 2) → + niveaux des bâtiments
//   > 70% (tier 3) → + troupes à l'extérieur du village
//   = 0   (tier 0) → échec total, aucun rapport
//
// Détection du défenseur :
//   - Le défenseur est notifié si ses scouts ont tué ≥ 1 éclaireur
//     ennemi, ou si l'attaque a été totalement repoussée (tier 0).
//   - En cas d'échec total, le défenseur voit "attaque bloquée"
//     mais NE voit PAS la composition de l'ennemi.
// ─────────────────────────────────────────────────────────────

export type ScoutTier = 0 | 1 | 2 | 3;

export type ScoutResult = {
  scoutsSent:           number;
  scoutsLost:           number;
  scoutsSurvived:       number;
  /** Ratio survivants / envoyés, entre 0.0 et 1.0 */
  survivorRatio:        number;
  /** Palier d'information : 0 = échec, 1/2/3 = succès croissant */
  tier:                 ScoutTier;
  /** Scouts défenseurs éliminés lors du combat */
  defenderScoutsKilled: number;
  /** true si le défenseur doit recevoir une notification */
  defenderDetected:     boolean;
};

export function resolveScout(
  scoutsAtt: number,
  scoutsDef: number,
): ScoutResult {

  // ── Cas dégénéré : aucun éclaireur envoyé ───────────────────
  if (scoutsAtt <= 0) {
    return {
      scoutsSent: 0, scoutsLost: 0, scoutsSurvived: 0,
      survivorRatio: 0, tier: 0,
      defenderScoutsKilled: 0, defenderDetected: false,
    };
  }

  // ── 1. Pertes attaquant ──────────────────────────────────────
  // tauxPertes = min(1.0,  2 × (scoutsDef / scoutsAtt)²)
  // Si le défenseur n'a pas de scouts → infiltration parfaite, 0 pertes.
  const lossRate = scoutsDef <= 0
    ? 0
    : Math.min(1.0, 2 * Math.pow(scoutsDef / scoutsAtt, 2));

  const scoutsLost     = Math.min(scoutsAtt, Math.ceil(scoutsAtt * lossRate));
  const scoutsSurvived = scoutsAtt - scoutsLost;
  const survivorRatio  = scoutsSurvived / scoutsAtt; // 0.0 → 1.0

  // ── 2. Palier d'information ──────────────────────────────────
  let tier: ScoutTier;
  if (scoutsSurvived === 0)      tier = 0;
  else if (survivorRatio > 0.70) tier = 3;
  else if (survivorRatio > 0.50) tier = 2;
  else                            tier = 1;

  // ── 3. Pertes défenseur (formule symétrique) ─────────────────
  // tauxPertesDef = min(1.0,  2 × (scoutsAtt / scoutsDef)²)
  let defenderScoutsKilled = 0;
  if (scoutsDef > 0) {
    const defLossRate    = Math.min(1.0, 2 * Math.pow(scoutsAtt / scoutsDef, 2));
    defenderScoutsKilled = Math.min(scoutsDef, Math.ceil(scoutsDef * defLossRate));
  }

  // ── 4. Détection ─────────────────────────────────────────────
  // Le défenseur est notifié si :
  //   a) Ses scouts ont éliminé au moins un ennemi (combat réel)
  //   b) L'attaque a été totalement repoussée (tier 0) — il voit
  //      "X éclaireurs repoussés" mais PAS les troupes adverses.
  const defenderDetected = defenderScoutsKilled > 0 || tier === 0;

  return {
    scoutsSent: scoutsAtt,
    scoutsLost,
    scoutsSurvived,
    survivorRatio,
    tier,
    defenderScoutsKilled,
    defenderDetected,
  };
}

// ─────────────────────────────────────────────────────────────
// DÉGÂTS DE SIÈGE PERMANENTS — Logique Tribal Wars officielle
//
// Appliqués après le combat uniquement si l'attaquant a gagné.
//
// ── Béliers → mur (formule simple, survivants) ──────────────
//   25 béliers survivants = −1 niveau de mur
//   levels_destroyed = floor(survivors * 2 / 50)
//
// ── Catapultes → bâtiment / mur (formule progressive) ───────
//   Résistance bâtiment par niveau n : floor(2 × 1.09^n) + 2
//     niv 1=4, niv 5=5, niv 10=7, niv 20=13
//   Résistance mur par niveau n : ceil(50 × 1.09^n)
//     niv 1=55, niv 5=77, niv 10=119, niv 20=282
//
//   Catapultes effectives (tirent avant de mourir) :
//     effective = initial × (1 − (lostCats/initial)^1.5)
//
//   Destruction itérative niveau par niveau jusqu'à
//   épuisement des points de dégâts.
//
// ── Règles spéciales ─────────────────────────────────────────
//   hiding_spot  : immunisé (non ciblable par les catapultes)
//   rally_point  : détruit (→ 0) si au moins 1 cat effective
//   wall (cats)  : multiplicateur ×0.5 (moins efficace que béliers)
// ─────────────────────────────────────────────────────────────

export type SiegeDamageEntry = { from: number; to: number };
export type SiegeDamages     = Record<string, SiegeDamageEntry>;

// Résistance d'un niveau de bâtiment standard
function bldgLevelResistance(level: number): number {
  return Math.floor(2 * Math.pow(1.09, level)) + 2;
}

// Résistance d'un niveau de mur (pour catapultes)
function wallLevelResistance(level: number): number {
  return Math.ceil(50 * Math.pow(1.09, level));
}

// Détruit itérativement les niveaux jusqu'à épuisement des dégâts
function iterativeDestruct(
  effectiveDamage: number,
  currentLevel:    number,
  resistanceFn:    (level: number) => number,
): number {
  let level  = currentLevel;
  let damage = effectiveDamage;
  while (level > 0 && damage > 0) {
    const cost = resistanceFn(level);
    if (damage >= cost) { damage -= cost; level--; }
    else break;
  }
  return level;
}

export function computeSiegeDamages(
  survivingRams:   number,
  initialCats:     number,
  lostCats:        number,        // cats perdues dans le combat
  catapultTarget:  string | null | undefined,
  buildingLevels:  Record<string, number>,
): SiegeDamages {
  const damages: SiegeDamages = {};

  // ── Béliers → mur ───────────────────────────────────────────
  // 25 béliers survivants = −1 niveau (survivants seulement)
  if (survivingRams > 0) {
    const wallLevel = buildingLevels['wall'] ?? 0;
    if (wallLevel > 0) {
      const levelsDestroyed = Math.floor(survivingRams * 2 / 50);
      if (levelsDestroyed > 0) {
        damages['wall'] = { from: wallLevel, to: Math.max(0, wallLevel - levelsDestroyed) };
      }
    }
  }

  // ── Catapultes → cible ──────────────────────────────────────
  if (initialCats > 0 && catapultTarget) {
    // Catapultes effectives : tirent avant de mourir
    const lossRatio    = initialCats > 0 ? lostCats / initialCats : 0;
    const effectiveCats = initialCats * (1 - Math.pow(Math.min(1, lossRatio), 1.5));

    if (catapultTarget === 'hiding_spot') {
      // Immunisé — aucun dégât
    } else if (catapultTarget === 'rally_point') {
      // Règle spéciale : 1 cat effective suffit à détruire le niveau 1
      const bldgLevel = buildingLevels['rally_point'] ?? 0;
      if (bldgLevel > 0 && effectiveCats >= 1) {
        damages['rally_point'] = { from: bldgLevel, to: 0 };
      }
    } else if (catapultTarget === 'wall') {
      // Mur : ×0.5 efficacité + résistance progressive wall
      const currentWall = damages['wall']?.to ?? (buildingLevels['wall'] ?? 0);
      if (currentWall > 0) {
        const effectiveDmg = effectiveCats * 0.5;
        const newLevel     = iterativeDestruct(effectiveDmg, currentWall, wallLevelResistance);
        if (newLevel < currentWall) {
          const fromLevel = damages['wall']?.from ?? currentWall;
          damages['wall'] = { from: fromLevel, to: newLevel };
        }
      }
    } else {
      // Bâtiment standard : résistance progressive par niveau
      const bldgLevel = buildingLevels[catapultTarget] ?? 0;
      if (bldgLevel > 0) {
        const newLevel = iterativeDestruct(effectiveCats, bldgLevel, bldgLevelResistance);
        if (newLevel < bldgLevel) {
          damages[catapultTarget] = { from: bldgLevel, to: newLevel };
        }
      }
    }
  }

  return damages;
}

// ─────────────────────────────────────────────────────────────
// TEMPS DE TRAJET
// vitesse en secondes/case → plus petit = plus rapide
// La vitesse de l'armée = vitesse de l'unité la plus lente
// ─────────────────────────────────────────────────────────────

export function calculateTravelTime(
  x1: number, y1: number,
  x2: number, y2: number,
  unitSpeed: number,   // secondes par case (la plus lente)
  gameSpeed: number,   // multiplicateur monde (1 = normal)
): number {
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return Math.max(1, Math.round((distance * unitSpeed) / gameSpeed));
}
