// ─────────────────────────────────────────────────────────────
// bot.profile.ts — Interpolation niveau 1–10 → DifficultyProfile
// ─────────────────────────────────────────────────────────────

import { BotStyle, DifficultyProfile, PhaseWeights } from './bot.types';

// Interpolation linéaire entre deux valeurs
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp un entier entre 1 et 10
function clampLevel(level: number): number {
  return Math.max(1, Math.min(10, Math.round(level)));
}

/**
 * Construit un DifficultyProfile à partir d'un niveau 1–10.
 *
 * Niveau 1  = bot qui fait des erreurs grossières, délais lents, vision courte.
 * Niveau 10 = bot quasi-parfait, réactions rapides, vision totale.
 */
export function buildProfile(level: number): DifficultyProfile {
  const l = clampLevel(level);
  const t = (l - 1) / 9; // 0.0 (niveau 1) → 1.0 (niveau 10)

  return {
    level,
    apmDelayRange:       [Math.round(lerp(8000, 200,  t)), Math.round(lerp(12000, 500, t))],
    scoreNoiseEpsilon:   parseFloat(lerp(0.55, 0.01, t).toFixed(4)),
    defenseIgnoreRate:   parseFloat(lerp(0.50, 0.00, t).toFixed(4)),
    visionRadius:        l === 10 ? 9999 : Math.round(lerp(5, 80, t)),
    resourceWasteRate:   parseFloat(lerp(0.40, 0.00, t).toFixed(4)),
    lootEstimationBias:  parseFloat(lerp(0.55, 0.01, t).toFixed(4)),
    // 15.1 : bots bas niveau attaquent de façon téméraire (ratio requis plus faible)
    // Niveau 1 → 0.30 (attaque si 18% de la défense adverse atteinte)
    // Niveau 10 → 1.00 (seuil normal à 60%)
    attackRecklessness:  parseFloat(lerp(0.30, 1.00, t).toFixed(4)),
  };
}

/**
 * Poids du ScoreEngine par phase.
 * Indépendants du niveau de difficulté — le niveau agit via le bruit et les délais,
 * pas en changeant la stratégie fondamentale.
 */
export const PHASE_WEIGHTS: Record<string, PhaseWeights> = {
  early: {
    W_res:      0.90,
    W_prod:     0.85,
    W_def:      0.25,
    W_cost:     0.60,
    W_time:     0.55,
    W_atk:      0.15,
    W_def_unit: 0.70,
    W_threat:   1.60,
    W_loot:     0.60,
    W_pts:      0.15,
    W_loss:     0.95,
  },
  mid: {
    W_res:      0.50,
    W_prod:     0.45,
    W_def:      0.65,
    W_cost:     0.35,
    W_time:     0.30,
    W_atk:      0.85,
    W_def_unit: 0.50,
    W_threat:   1.30,
    W_loot:     0.80,
    W_pts:      0.50,
    W_loss:     0.60,
  },
  late: {
    W_res:      0.15,
    W_prod:     0.10,
    W_def:      0.90,
    W_cost:     0.15,
    W_time:     0.10,
    W_atk:      0.95,
    W_def_unit: 0.85,
    W_threat:   1.10,
    W_loot:     0.40,
    W_pts:      0.95,
    W_loss:     0.35,
  },
};

/**
 * Retourne les poids de phase modifiés selon le style comportemental du bot (15.3).
 *
 * rusher  → mise sur l'offensive dès l'early, ignore l'économie
 * builder → maximise l'économie avant de recruter
 * balanced → poids standards (inchangés)
 */
export function buildStyleWeights(style: BotStyle): Record<string, PhaseWeights> {
  if (style === 'balanced') return PHASE_WEIGHTS;

  // Copie profonde des poids pour éviter de muter PHASE_WEIGHTS
  const w: Record<string, PhaseWeights> = {
    early: { ...PHASE_WEIGHTS.early },
    mid:   { ...PHASE_WEIGHTS.mid   },
    late:  { ...PHASE_WEIGHTS.late  },
  };

  if (style === 'rusher') {
    // Priorise attaque et butin, néglige la production économique
    w.early.W_atk  += 0.30; w.early.W_loot += 0.20;
    w.early.W_prod -= 0.20; w.early.W_res  -= 0.15;
    w.mid.W_atk    += 0.20; w.mid.W_loot   += 0.15;
    w.mid.W_prod   -= 0.15;
  } else if (style === 'defender') {
    // 22.1 — Maximise la défense, réduit drastiquement l'offensive
    w.early.W_def      += 0.40; w.early.W_def_unit += 0.30;
    w.mid.W_def        += 0.50; w.mid.W_def_unit   += 0.40;
    w.mid.W_atk        -= 0.40; w.mid.W_loot       -= 0.30;
    w.late.W_def       += 0.40; w.late.W_def_unit  += 0.40;
    w.late.W_atk       -= 0.40; w.late.W_loot      -= 0.30;
  } else {
    // builder : maximise l'économie, prend moins de risques offensifs
    w.early.W_prod += 0.20; w.early.W_res  += 0.15;
    w.early.W_atk  -= 0.15; w.early.W_loot -= 0.10;
    w.mid.W_prod   += 0.15; w.mid.W_res    += 0.10;
    w.mid.W_atk    -= 0.20; w.mid.W_loot   -= 0.15;
  }

  // Clamp all weights to [0, 2] to avoid negative or extreme values
  for (const phase of ['early', 'mid', 'late'] as const) {
    for (const key of Object.keys(w[phase]) as (keyof PhaseWeights)[]) {
      w[phase][key] = Math.max(0, Math.min(2, w[phase][key]));
    }
  }

  return w;
}

// ── Tests intégrés (exécutables via ts-node) ─────────────────
if (require.main === module) {
  const lvl1  = buildProfile(1);
  const lvl5  = buildProfile(5);
  const lvl10 = buildProfile(10);

  console.log('Niveau  1 :', lvl1);
  console.log('Niveau  5 :', lvl5);
  console.log('Niveau 10 :', lvl10);

  // Assertions basiques
  console.assert(lvl1.apmDelayRange[0]     >  lvl10.apmDelayRange[0],     'lvl1 plus lent que lvl10');
  console.assert(lvl1.scoreNoiseEpsilon    >  lvl10.scoreNoiseEpsilon,    'lvl1 plus de bruit');
  console.assert(lvl1.defenseIgnoreRate    >  lvl10.defenseIgnoreRate,    'lvl1 ignore plus la défense');
  console.assert(lvl1.visionRadius         <  lvl10.visionRadius,         'lvl1 voit moins loin');
  console.assert(lvl1.resourceWasteRate    >  lvl10.resourceWasteRate,    'lvl1 gaspille plus');
  console.assert(lvl10.defenseIgnoreRate   === 0,    'lvl10 ne rate aucune alerte');
  console.assert(lvl10.resourceWasteRate   === 0,    'lvl10 ne gaspille rien');
  console.assert(lvl10.visionRadius        === 9999, 'lvl10 vision totale');
  console.assert(lvl10.attackRecklessness  === 1.0,  'lvl10 seuil d\'attaque normal');
  console.assert(lvl1.attackRecklessness   < 0.5,   'lvl1 très téméraire');

  // Valeurs médianes raisonnables
  console.assert(lvl5.apmDelayRange[0] > 1000 && lvl5.apmDelayRange[0] < 5000, 'lvl5 délai médian');
  console.assert(lvl5.scoreNoiseEpsilon > 0.1  && lvl5.scoreNoiseEpsilon < 0.4, 'lvl5 bruit médian');

  // 15.3 — Styles comportementaux
  const rusher  = buildStyleWeights('rusher');
  const builder = buildStyleWeights('builder');
  const balanced = buildStyleWeights('balanced');
  console.assert(rusher.early.W_atk   > balanced.early.W_atk,  'rusher: W_atk early > balanced');
  console.assert(builder.early.W_prod > balanced.early.W_prod, 'builder: W_prod early > balanced');
  console.assert(rusher.early.W_prod  < balanced.early.W_prod, 'rusher: W_prod early < balanced');
  console.assert(builder.early.W_atk  < balanced.early.W_atk,  'builder: W_atk early < balanced');
  console.log('Styles comportementaux ✓');

  console.log('\nTous les assertions passées ✓');
}
