// ─────────────────────────────────────────────────────────────
// bot.fsm.ts — Finite State Machine (transitions de phase)
// ─────────────────────────────────────────────────────────────

import { Phase, GameSnapshot } from './bot.types';

/**
 * Évalue si la phase courante doit changer.
 * Appelée à chaque tick, avant le calcul des scores.
 *
 * early  → phase de développement économique (mines, entrepôt, caserne)
 * mid    → phase de recrutement et pillage
 * late   → phase de conquête et défense totale
 */
export function evaluatePhase(current: Phase, snap: GameSnapshot): Phase {

  // ── early → mid ─────────────────────────────────────────
  if (current === 'early') {
    // Transition normale : mines développées + caserne construite + temps suffisant
    const normal =
      snap.minesLevel    >= 3 &&
      snap.barracksLevel >= 1 &&
      snap.timeElapsedMinutes >= 15;

    // Transition urgence : attaque entrante sans défense suffisante
    const urgency =
      snap.incomingAttacks.length > 0 &&
      snap.defensivePower < snap.defenseThreshold * 0.5;

    if (normal || urgency) return 'mid';
  }

  // ── mid → late ──────────────────────────────────────────
  if (current === 'mid') {
    // Transition normale : armée constituée + temps avancé
    const normal =
      snap.offensivePower >= snap.attackCapacity &&
      snap.timeElapsedMinutes >= 40;

    // Transition opportuniste : joueur faible détecté
    const weakTarget = snap.allTargets.find(
      t =>
        t.type === 'player' &&
        t.defensivePower > 0 &&
        snap.offensivePower / t.defensivePower >= 1.8,
    );
    const opportunist =
      weakTarget !== undefined &&
      snap.timeElapsedMinutes >= 30;

    if (normal || opportunist) return 'late';
  }

  // 28.8 — Réversion de phase : si en late mais totalement ruiné, repasser en mid
  // Évite de rester bloqué en "staging" sans pouvoir reconstruire.
  const isRuin = snap.offensivePower < 100 && (snap.wood + snap.stone + snap.iron) < 1000;
  if (current === 'late' && isRuin && snap.loyaltyPoints > 50) {
    return 'mid';
  }

  // ── Loyauté critique → forcer late (défense prioritaire) ─
  if (snap.loyaltyPoints < 30 && current !== 'late') {
    return 'late';
  }

  return current;
}

// ── Self-test (ts-node src/bot/bot.fsm.ts) ──────────────────
if (require.main === module) {
  const base: GameSnapshot = {
    villageId: 'test',
    wood: 1000, stone: 1000, iron: 1000, maxStorage: 5000,
    buildQueueCount: 0,
    availableBuildings: [],
    recruitQueues: {},
    availableUnits: [],
    allTargets: [],
    incomingAttacks:   [],
    outgoingTraveling: [],
    troopsHome: {}, troopsInTransit: {},
    offensivePower: 0, defensivePower: 0,
    defenseThreshold: 200, attackCapacity: 500,
    minesLevel: 0, barracksLevel: 0, wallLevel: 0,
    rallyPointBuilt: false,
    populationAvailable: 100, loyaltyPoints: 100,
    bottleneckResource: null, conquestTargetId: null,
    attackRecklessness: 1.0, noEarlyPlayerAttack: false,
    timeElapsedMinutes: 0,
    alliedVillages: [], recentHeavyLoss: false,
  };

  // 1. early reste early si conditions non remplies
  const s1 = { ...base, minesLevel: 2, barracksLevel: 0, timeElapsedMinutes: 10 };
  console.assert(evaluatePhase('early', s1) === 'early', '❌ early doit rester early');

  // 2. early → mid : transition normale
  const s2 = { ...base, minesLevel: 3, barracksLevel: 1, timeElapsedMinutes: 15 };
  console.assert(evaluatePhase('early', s2) === 'mid', '❌ early → mid normale');

  // 3. early → mid : transition urgence (attaque sans défense)
  const s3 = {
    ...base,
    incomingAttacks: [{ id: 'a', attackerPower: 500, arrivalTimeSeconds: 60, isConfirmed: false }],
    defensivePower: 50, defenseThreshold: 200,
  };
  console.assert(evaluatePhase('early', s3) === 'mid', '❌ early → mid urgence');

  // 4. mid reste mid si conditions non remplies
  const s4 = { ...base, offensivePower: 200, timeElapsedMinutes: 30 };
  console.assert(evaluatePhase('mid', s4) === 'mid', '❌ mid doit rester mid');

  // 5. mid → late : transition normale
  const s5 = { ...base, offensivePower: 600, attackCapacity: 500, timeElapsedMinutes: 40 };
  console.assert(evaluatePhase('mid', s5) === 'late', '❌ mid → late normale');

  // 6. mid → late : transition opportuniste
  const s6 = {
    ...base,
    offensivePower: 900, timeElapsedMinutes: 32,
    allTargets: [{
      id: 'v1', type: 'player' as const, distanceTiles: 5,
      travelTimeSeconds: 10, estimatedResources: 2000,
      defensivePower: 400, points: 100, lastScouted: null,
    }],
  };
  console.assert(evaluatePhase('mid', s6) === 'late', '❌ mid → late opportuniste');

  // 7. Loyauté critique → forcer late depuis early
  const s7 = { ...base, loyaltyPoints: 20 };
  console.assert(evaluatePhase('early', s7) === 'late', '❌ loyauté critique → late');

  // 8. late reste late
  const s8 = { ...base, loyaltyPoints: 100 };
  console.assert(evaluatePhase('late', s8) === 'late', '❌ late doit rester late');

  console.log('Tous les assertions passées ✓');
}
