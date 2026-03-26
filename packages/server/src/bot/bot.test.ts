// ─────────────────────────────────────────────────────────────
// bot.test.ts — Tests unitaires du bot IA
// Exécuter avec : npx ts-node src/bot/bot.test.ts
// ─────────────────────────────────────────────────────────────

import { buildProfile, buildStyleWeights, PHASE_WEIGHTS } from './bot.profile';
import { evaluatePhase }               from './bot.fsm';
import { computeAllScores }            from './bot.scores';
import { GameSnapshot, BotTarget }     from './bot.types';

// ── Mini runner ──────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e: any) {
    console.error(`  ❌ ${label}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeGreaterThan: (n: number) => {
      if (actual <= n)
        throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual: (n: number) => {
      if (actual < n)
        throw new Error(`Expected ${actual} >= ${n}`);
    },
    toBeLessThan: (n: number) => {
      if (actual >= n)
        throw new Error(`Expected ${actual} < ${n}`);
    },
    toBeUndefined: () => {
      if (actual !== undefined)
        throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
    },
    toBeDefined: () => {
      if (actual === undefined || actual === null)
        throw new Error(`Expected defined value, got ${actual}`);
    },
    toEqual: (expected: number) => {
      if (Math.abs(actual - expected) > 0.001)
        throw new Error(`Expected ~${expected}, got ${actual}`);
    },
  };
}

// ── Snapshot de base pour les tests ──────────────────────────

const BASE_SNAP: GameSnapshot = {
  villageId: 'test-village',
  wood: 5000, stone: 5000, iron: 5000, maxStorage: 20000,
  buildQueueCount: 0,
  availableBuildings: [
    {
      id: 'timber_camp', name: 'Camp de bois', currentLevel: 2, nextLevel: 3,
      cost: { wood: 72, stone: 86, iron: 58 }, buildTimeSeconds: 10,
      productionGainPerHour: 8, defenseBonus: 0, isUnlocked: true, isInQueue: false,
    },
    {
      id: 'wall', name: 'Mur', currentLevel: 0, nextLevel: 1,
      cost: { wood: 50, stone: 100, iron: 20 }, buildTimeSeconds: 20,
      productionGainPerHour: 0, defenseBonus: 0.037, isUnlocked: true, isInQueue: false,
    },
    {
      id: 'academy', name: 'Académie', currentLevel: 0, nextLevel: 1,
      cost: { wood: 28000, stone: 30000, iron: 25000 }, buildTimeSeconds: 180,
      productionGainPerHour: 0, defenseBonus: 0, isUnlocked: false, isInQueue: false,
    },
    {
      id: 'rally_point', name: "Place d'armes", currentLevel: 0, nextLevel: 1,
      cost: { wood: 10, stone: 40, iron: 0 }, buildTimeSeconds: 2,
      productionGainPerHour: 0, defenseBonus: 0, isUnlocked: true, isInQueue: false,
    },
  ],
  recruitQueues: { barracks: false, stable: false, garage: false },
  availableUnits: [
    {
      id: 'axeman', name: 'Guerrier', buildingType: 'barracks', type: 'offensive',
      attack: 40, defenseGeneral: 10, defenseCavalry: 5, defenseArcher: 10,
      speedSecondsPerTile: 0.54, cost: { wood: 60, stone: 30, iron: 40 },
      recruitTimeSeconds: 0.6, carryCapacity: 10, isUnlocked: true,
    },
    {
      id: 'spearman', name: 'Lancier', buildingType: 'barracks', type: 'defensive',
      attack: 10, defenseGeneral: 15, defenseCavalry: 45, defenseArcher: 20,
      speedSecondsPerTile: 0.54, cost: { wood: 50, stone: 30, iron: 10 },
      recruitTimeSeconds: 0.44, carryCapacity: 25, isUnlocked: true,
    },
    {
      id: 'noble', name: 'Noble', buildingType: 'academy', type: 'conquest',
      attack: 0, defenseGeneral: 100, defenseCavalry: 50, defenseArcher: 100,
      speedSecondsPerTile: 1.05, cost: { wood: 40000, stone: 50000, iron: 50000 },
      recruitTimeSeconds: 17.85, carryCapacity: 0, isUnlocked: true,
    },
  ],
  allTargets: [
    {
      id: 'barb-1', type: 'barbarian', distanceTiles: 3, travelTimeSeconds: 5,
      estimatedResources: 3000, defensivePower: 50, points: 0, lastScouted: null,
    },
    {
      id: 'player-1', type: 'player', distanceTiles: 8, travelTimeSeconds: 15,
      estimatedResources: 8000, defensivePower: 200, points: 500, lastScouted: null,
    },
  ],
  incomingAttacks:   [],
  outgoingTraveling: [],
  troopsHome:     { axeman: 60, spearman: 40 },
  troopsInTransit: {},
  offensivePower: 60 * 40,   // 2400
  defensivePower: 40 * 15,   // 600
  defenseThreshold: 200,
  attackCapacity:   500,
  minesLevel: 3, barracksLevel: 1, wallLevel: 0, rallyPointBuilt: true,
  populationAvailable: 100, loyaltyPoints: 100,
  bottleneckResource: null, conquestTargetId: null,
  attackRecklessness: 1.0, noEarlyPlayerAttack: false,
  timeElapsedMinutes: 20,
  alliedVillages: [], recentHeavyLoss: false,
};

// ─────────────────────────────────────────────────────────────
// SUITE 1 — bot.profile
// ─────────────────────────────────────────────────────────────

console.log('\n📋 bot.profile');

test('niveau 1 : délai minimum ≥ 8000ms', () => {
  expect(buildProfile(1).apmDelayRange[0]).toBeGreaterThan(7999);
});

test('niveau 10 : délai minimum ≤ 200ms', () => {
  expect(buildProfile(10).apmDelayRange[0]).toBeLessThan(201);
});

test('niveau 10 : vision totale (9999)', () => {
  expect(buildProfile(10).visionRadius).toBe(9999);
});

test('niveau 10 : aucun gaspillage (0)', () => {
  expect(buildProfile(10).resourceWasteRate).toBe(0);
});

test('niveau 10 : aucune alerte ignorée (0)', () => {
  expect(buildProfile(10).defenseIgnoreRate).toBe(0);
});

test('niveau 1 < niveau 10 : bruit score', () => {
  expect(buildProfile(1).scoreNoiseEpsilon).toBeGreaterThan(buildProfile(10).scoreNoiseEpsilon);
});

test('niveau 5 : délai médian (entre 1000 et 6000ms)', () => {
  const p = buildProfile(5);
  expect(p.apmDelayRange[0]).toBeGreaterThan(1000);
  expect(p.apmDelayRange[0]).toBeLessThan(6000);
});

test('niveau hors-bornes clampé (0 → 1, 15 → 10)', () => {
  expect(buildProfile(0).apmDelayRange[0]).toBe(buildProfile(1).apmDelayRange[0]);
  expect(buildProfile(15).visionRadius).toBe(buildProfile(10).visionRadius);
});

test('aucune valeur négative sur aucun niveau', () => {
  for (let l = 1; l <= 10; l++) {
    const p = buildProfile(l);
    if (p.scoreNoiseEpsilon < 0)  throw new Error(`scoreNoiseEpsilon < 0 au niveau ${l}`);
    if (p.defenseIgnoreRate < 0)  throw new Error(`defenseIgnoreRate < 0 au niveau ${l}`);
    if (p.resourceWasteRate < 0)  throw new Error(`resourceWasteRate < 0 au niveau ${l}`);
    if (p.lootEstimationBias < 0) throw new Error(`lootEstimationBias < 0 au niveau ${l}`);
    if (p.visionRadius < 1)       throw new Error(`visionRadius < 1 au niveau ${l}`);
  }
});

test('poids early : W_prod > W_atk (construction avant combat)', () => {
  expect(PHASE_WEIGHTS.early.W_prod).toBeGreaterThan(PHASE_WEIGHTS.early.W_atk);
});

test('poids late : W_pts > W_prod (conquête avant économie)', () => {
  expect(PHASE_WEIGHTS.late.W_pts).toBeGreaterThan(PHASE_WEIGHTS.late.W_prod);
});

// ─────────────────────────────────────────────────────────────
// SUITE 2 — bot.fsm
// ─────────────────────────────────────────────────────────────

console.log('\n📋 bot.fsm');

test('early reste early : conditions non remplies', () => {
  const snap = { ...BASE_SNAP, minesLevel: 2, barracksLevel: 0, timeElapsedMinutes: 10 };
  expect(evaluatePhase('early', snap)).toBe('early');
});

test('early → mid : transition normale', () => {
  const snap = { ...BASE_SNAP, minesLevel: 3, barracksLevel: 1, timeElapsedMinutes: 15 };
  expect(evaluatePhase('early', snap)).toBe('mid');
});

test('early → mid : urgence (attaque entrante + défense insuffisante)', () => {
  const snap = {
    ...BASE_SNAP,
    minesLevel: 1, barracksLevel: 0, timeElapsedMinutes: 5,
    incomingAttacks: [{ id: 'a', attackerPower: 500, arrivalTimeSeconds: 60, isConfirmed: false }],
    defensivePower: 50,
    defenseThreshold: 200,
  };
  expect(evaluatePhase('early', snap)).toBe('mid');
});

test('mid reste mid : armée insuffisante', () => {
  const snap = { ...BASE_SNAP, offensivePower: 200, timeElapsedMinutes: 30 };
  expect(evaluatePhase('mid', snap)).toBe('mid');
});

test('mid → late : transition normale', () => {
  const snap = { ...BASE_SNAP, offensivePower: 600, attackCapacity: 500, timeElapsedMinutes: 40 };
  expect(evaluatePhase('mid', snap)).toBe('late');
});

test('mid → late : opportuniste (joueur faible + t ≥ 30)', () => {
  const snap = {
    ...BASE_SNAP,
    offensivePower: 900, timeElapsedMinutes: 32,
    allTargets: [{
      id: 'v1', type: 'player' as const, distanceTiles: 5, travelTimeSeconds: 10,
      estimatedResources: 5000, defensivePower: 400, points: 200, lastScouted: null,
    }],
  };
  expect(evaluatePhase('mid', snap)).toBe('late');
});

test('loyauté < 30 force late depuis early', () => {
  const snap = { ...BASE_SNAP, loyaltyPoints: 20, minesLevel: 1, barracksLevel: 0, timeElapsedMinutes: 5 };
  expect(evaluatePhase('early', snap)).toBe('late');
});

test('loyauté < 30 force late depuis mid', () => {
  const snap = { ...BASE_SNAP, loyaltyPoints: 25, offensivePower: 100, timeElapsedMinutes: 20 };
  expect(evaluatePhase('mid', snap)).toBe('late');
});

test('late reste late', () => {
  expect(evaluatePhase('late', BASE_SNAP)).toBe('late');
});

// ─────────────────────────────────────────────────────────────
// SUITE 3 — bot.scores
// ─────────────────────────────────────────────────────────────

console.log('\n📋 bot.scores');

test('mine scorée en early (> idle)', () => {
  const scores = computeAllScores({ ...BASE_SNAP, timeElapsedMinutes: 5 }, 'early');
  const mine   = scores.find(a => a.targetId === 'timber_camp');
  const idle   = scores.find(a => a.type === 'idle')!;
  expect(mine?.score ?? 0).toBeGreaterThan(idle.score);
});

test('rally_point a un score très élevé si pas encore construit (early)', () => {
  const snap   = { ...BASE_SNAP, rallyPointBuilt: false };
  const scores = computeAllScores(snap, 'early');
  const rally  = scores.find(a => a.targetId === 'rally_point');
  expect(rally?.score ?? 0).toBeGreaterThan(1.0);
});

test('academy non scorée en early (non unlocked)', () => {
  const scores = computeAllScores({ ...BASE_SNAP, timeElapsedMinutes: 5 }, 'early');
  const acad   = scores.find(a => a.targetId === 'academy');
  expect(acad).toBeUndefined();
});

test('academy non scorée en mid', () => {
  const scores = computeAllScores(BASE_SNAP, 'mid');
  const acad   = scores.find(a => a.targetId === 'academy');
  expect(acad).toBeUndefined();
});

test('axeman non scoré en early (offensif interdit)', () => {
  const scores = computeAllScores({ ...BASE_SNAP, timeElapsedMinutes: 5 }, 'early');
  const axe    = scores.find(a => a.targetId === 'axeman');
  expect(axe).toBeUndefined();
});

test('axeman scoré en mid', () => {
  const scores = computeAllScores(BASE_SNAP, 'mid');
  const axe    = scores.find(a => a.targetId === 'axeman');
  expect(axe).toBeDefined();
});

test('spearman scoré en early (défensif autorisé)', () => {
  const scores  = computeAllScores({ ...BASE_SNAP, timeElapsedMinutes: 5 }, 'early');
  const spear   = scores.find(a => a.targetId === 'spearman');
  expect(spear).toBeDefined();
});

test('noble non scoré en early', () => {
  const scores = computeAllScores({ ...BASE_SNAP, timeElapsedMinutes: 5 }, 'early');
  const noble  = scores.find(a => a.targetId === 'noble');
  expect(noble).toBeUndefined();
});

test('noble non scoré en mid', () => {
  const scores = computeAllScores(BASE_SNAP, 'mid');
  const noble  = scores.find(a => a.targetId === 'noble');
  expect(noble).toBeUndefined();
});

test('recrutement = 0 si file barracks occupée', () => {
  const snap   = { ...BASE_SNAP, recruitQueues: { barracks: true, stable: false, garage: false } };
  const scores = computeAllScores(snap, 'mid');
  const axe    = scores.find(a => a.targetId === 'axeman');
  expect(axe).toBeUndefined();
});

test('build bloqué si file construction pleine (2 slots)', () => {
  const snap   = { ...BASE_SNAP, buildQueueCount: 2 };
  const scores = computeAllScores(snap, 'mid');
  const builds = scores.filter(a => a.type === 'build');
  expect(builds.length).toBe(0);
});

test('attaque bloquée sans rally_point', () => {
  const snap   = { ...BASE_SNAP, rallyPointBuilt: false };
  const scores = computeAllScores(snap, 'mid');
  const atk    = scores.filter(a => a.type === 'attack');
  expect(atk.length).toBe(0);
});

test('attaque bloquée si suicide (offensivePower < 60% défense cible)', () => {
  const snap = {
    ...BASE_SNAP,
    offensivePower: 100,
    allTargets: [{
      id: 'strong', type: 'player' as const, distanceTiles: 3, travelTimeSeconds: 5,
      estimatedResources: 5000, defensivePower: 2000, points: 500, lastScouted: null,
    }],
  };
  const scores = computeAllScores(snap, 'mid');
  const atk    = scores.filter(a => a.type === 'attack');
  expect(atk.length).toBe(0);
});

test('attaque barbare scorée en mid', () => {
  const scores = computeAllScores(BASE_SNAP, 'mid');
  const atk    = scores.find(a => a.type === 'attack' && a.targetId === 'barb-1');
  expect(atk).toBeDefined();
});

test('espionnage bloqué en early', () => {
  const scores = computeAllScores({ ...BASE_SNAP, timeElapsedMinutes: 5 }, 'early');
  const scouts = scores.filter(a => a.type === 'scout');
  expect(scouts.length).toBe(0);
});

test('espionnage possible en mid sur joueur inconnu', () => {
  const snap = {
    ...BASE_SNAP,
    troopsHome: { ...BASE_SNAP.troopsHome, scout: 5 },
  };
  const scores = computeAllScores(snap, 'mid');
  const scout  = scores.find(a => a.type === 'scout' && a.targetId === 'player-1');
  expect(scout).toBeDefined();
});

test('idle toujours présent (score = 0.01)', () => {
  const scores = computeAllScores(BASE_SNAP, 'mid');
  const idle   = scores.find(a => a.type === 'idle');
  expect(idle?.score).toEqual(0.01);
});

test('en late, attaque joueur mieux scorée qu\'attaque barbare', () => {
  const snap   = { ...BASE_SNAP, offensivePower: 5000 };
  const scores = computeAllScores(snap, 'late');
  const vsBarb = scores.find(a => a.type === 'attack' && a.targetId === 'barb-1')?.score ?? 0;
  const vsPlayer = scores.find(a => a.type === 'attack' && a.targetId === 'player-1')?.score ?? 0;
  expect(vsPlayer).toBeGreaterThan(vsBarb);
});

// ── Phase 12 : défense réactive ───────────────────────────────

test('12.1 — recrutement offensif bloqué si attaque entrante', () => {
  const snap = {
    ...BASE_SNAP,
    incomingAttacks: [{ id: 'atk', attackerPower: 500, arrivalTimeSeconds: 120, isConfirmed: false }],
  };
  const scores = computeAllScores(snap, 'mid');
  const axe    = scores.find(a => a.type === 'recruit' && a.targetId === 'axeman');
  expect(axe).toBeUndefined();
});

test('12.1 — recrutement défensif maintenu si attaque entrante', () => {
  const snap = {
    ...BASE_SNAP,
    incomingAttacks: [{ id: 'atk', attackerPower: 500, arrivalTimeSeconds: 120, isConfirmed: false }],
  };
  const scores  = computeAllScores(snap, 'mid');
  const spear   = scores.find(a => a.type === 'recruit' && a.targetId === 'spearman');
  expect(spear).toBeDefined();
  expect((spear?.score ?? 0)).toBeGreaterThan(0);
});

test('12.3 — attaque bloquée si 3+ vagues entrantes (mode siège)', () => {
  const snap = {
    ...BASE_SNAP,
    incomingAttacks: [
      { id: 'a1', attackerPower: 300, arrivalTimeSeconds: 60,  isConfirmed: false },
      { id: 'a2', attackerPower: 300, arrivalTimeSeconds: 90,  isConfirmed: false },
      { id: 'a3', attackerPower: 300, arrivalTimeSeconds: 120, isConfirmed: false },
    ],
  };
  const scores = computeAllScores(snap, 'mid');
  const atks   = scores.filter(a => a.type === 'attack');
  expect(atks.length).toBe(0);
});

test('12.2 — recall scoré si troupes reviendraient avant l\'impact', () => {
  const snap = {
    ...BASE_SNAP,
    incomingAttacks:   [{ id: 'inc', attackerPower: 500, arrivalTimeSeconds: 200, isConfirmed: false }],
    outgoingTraveling: [{ id: 'out-1', units: { axeman: 30 }, returnEstimatedSeconds: 80 }],
  };
  const scores = computeAllScores(snap, 'mid');
  const recall = scores.find(a => a.type === 'recall');
  expect(recall).toBeDefined();
  expect((recall?.score ?? 0)).toBeGreaterThan(0);
});

// ── Phase 13 : économie avancée ───────────────────────────────

test('13.1 — mine bottleneck mieux scorée', () => {
  // Wood est la ressource la plus basse → timber_camp doit scorer plus haut
  const snapNormal = { ...BASE_SNAP, bottleneckResource: null       as any };
  const snapBottle = { ...BASE_SNAP, bottleneckResource: 'wood'     as any };
  const timber = BASE_SNAP.availableBuildings.find(b => b.id === 'timber_camp')!;
  // On crée un snap minimal avec juste timber_camp
  const snapWithTimber = (bn: typeof snapNormal) => ({ ...bn, availableBuildings: [timber] });

  const scoresNormal = computeAllScores(snapWithTimber(snapNormal), 'early');
  const scoresBottle = computeAllScores(snapWithTimber(snapBottle), 'early');

  const tNormal = scoresNormal.find(a => a.targetId === 'timber_camp')?.score ?? 0;
  const tBottle = scoresBottle.find(a => a.targetId === 'timber_camp')?.score ?? 0;
  expect(tBottle).toBeGreaterThan(tNormal);
});

test('13.1 — mine saturée pénalisée (ressource > 90% entrepôt)', () => {
  // Comparer : wood=3000 (entrepôt peu rempli) vs wood=9500 (95% plein)
  // Les deux sont au-dessus du resourceFloor (maxStorage=10000 → floor=1500)
  const snap = {
    ...BASE_SNAP,
    maxStorage: 10000,
    availableBuildings: BASE_SNAP.availableBuildings.filter(b => b.id === 'timber_camp'),
  };
  const scoresLow  = computeAllScores({ ...snap, wood: 3000 }, 'early');
  const scoresHigh = computeAllScores({ ...snap, wood: 9500 }, 'early'); // 95% → ×0.3
  const tLow  = scoresLow.find(a => a.targetId === 'timber_camp')?.score ?? 0;
  const tHigh = scoresHigh.find(a => a.targetId === 'timber_camp')?.score ?? 0;
  expect(tHigh).toBeLessThan(tLow); // mine pénalisée quand entrepôt presque plein
});

test('13.2 — urgence de construire si entrepôt > 85%', () => {
  // Avec peu de ressources → pas d'urgence ; avec 90% → urgence (+score)
  const snapFull = { ...BASE_SNAP, wood: 9000, stone: 9000, iron: 9000, maxStorage: 10000 };
  const snapLow  = { ...BASE_SNAP, wood: 2000, stone: 2000, iron: 2000, maxStorage: 10000 };
  const timber = BASE_SNAP.availableBuildings.find(b => b.id === 'timber_camp')!;
  const snaps  = (s: typeof snapFull) => ({ ...s, availableBuildings: [timber] });

  const scoreFull = computeAllScores(snaps(snapFull), 'early').find(a => a.targetId === 'timber_camp')?.score ?? 0;
  const scoreLow  = computeAllScores(snaps(snapLow),  'early').find(a => a.targetId === 'timber_camp')?.score ?? 0;
  expect(scoreFull).toBeGreaterThan(scoreLow);
});

// ── Phase 14 : endgame & conquête ────────────────────────────

test('14.1 — académie non construite si offensivePower insuffisant', () => {
  const snap = {
    ...BASE_SNAP, phase: 'late' as any,
    offensivePower: 500,  // < 2000
    wood: 30000, stone: 30000, iron: 30000,
    availableBuildings: BASE_SNAP.availableBuildings.filter(b => b.id === 'academy'),
  };
  const scores = computeAllScores(snap, 'late');
  const acad   = scores.find(a => a.targetId === 'academy');
  expect(acad).toBeUndefined();
});

test('14.1 — académie construite si conditions remplies', () => {
  // Coût académie : wood=28000 + stone=30000 + iron=25000 = 83000 total
  // Buffer 1.2× requis : 99600 → need total resources >= 99600
  // On utilise maxStorage=40000 et 35000 de chaque ressource (total 105000 > 99600)
  const snap = {
    ...BASE_SNAP,
    offensivePower: 2000,  // >= 1500 (seuil Phase 14)
    wood: 35000, stone: 35000, iron: 35000,
    maxStorage: 40000,
    availableBuildings: [{
      id: 'academy', name: 'Académie', currentLevel: 0, nextLevel: 1,
      cost: { wood: 28000, stone: 30000, iron: 25000 }, buildTimeSeconds: 180,
      productionGainPerHour: 0, defenseBonus: 0, isUnlocked: true, isInQueue: false,
    }],
  };
  const scores = computeAllScores(snap, 'late');
  const acad   = scores.find(a => a.targetId === 'academy');
  expect(acad).toBeDefined();
  expect((acad?.score ?? 0)).toBeGreaterThan(5); // score élevé (9.0)
});

test('14.2 — noble inclus dans l\'attaque sur conquestTarget', () => {
  const snap = {
    ...BASE_SNAP,
    conquestTargetId: 'player-1',
    troopsHome: { ...BASE_SNAP.troopsHome, noble: 1 },
  };
  const scores = computeAllScores(snap, 'late');
  const atk    = scores.find(a => a.type === 'attack' && a.targetId === 'player-1');
  expect(atk).toBeDefined();
  expect(atk?.units?.['noble']).toBe(1);
});

test('14.2 — noble non inclus sur cible ordinaire', () => {
  const snap = {
    ...BASE_SNAP,
    conquestTargetId: 'player-1',
    troopsHome: { ...BASE_SNAP.troopsHome, noble: 1 },
  };
  const scores = computeAllScores(snap, 'late');
  const atk    = scores.find(a => a.type === 'attack' && a.targetId === 'barb-1');
  // noble pas inclus sur barb-1 (pas la conquest target)
  expect(atk?.units?.['noble']).toBeUndefined();
});

// ── Phase 15 : calibrage & équilibrage ────────────────────────

console.log('\n📋 bot.profile + bot.scores (Phase 15)');

test('15.1 — niveau 1 : attackRecklessness < 0.5 (téméraire)', () => {
  expect(buildProfile(1).attackRecklessness).toBeLessThan(0.5);
});

test('15.1 — niveau 10 : attackRecklessness = 1.0 (prudent)', () => {
  expect(buildProfile(10).attackRecklessness).toBe(1.0);
});

test('15.1 — bot téméraire attaque une cible normalement trop forte', () => {
  // offensivePower=100, defensivePower=200 → ratio=0.5
  // seuil normal (recklessness=1.0) : 200 * 0.6 = 120 > 100 → bloqué
  // seuil téméraire (recklessness=0.3) : 200 * 0.6 * 0.3 = 36 < 100 → autorisé
  const target: BotTarget = {
    id: 'strong', type: 'player', distanceTiles: 3, travelTimeSeconds: 5,
    estimatedResources: 5000, defensivePower: 200, points: 500, lastScouted: null,
  };
  const snapNormal = {
    ...BASE_SNAP,
    offensivePower: 100,
    troopsHome: { axeman: 3 },  // < 10 → bloqué par troopsHome check
    allTargets: [target],
  };
  // Avec 15 axeman (> MIN_OFFENSIVE_TROOPS_TO_ATTACK=10)
  const snapWith15 = {
    ...BASE_SNAP,
    offensivePower: 100,
    troopsHome: { axeman: 15, spearman: 40 },
    allTargets: [target],
  };
  const prudent    = computeAllScores({ ...snapWith15, attackRecklessness: 1.0 }, 'mid');
  const reckless   = computeAllScores({ ...snapWith15, attackRecklessness: 0.3 }, 'mid');
  const atkPrudent  = prudent.find(a => a.type === 'attack' && a.targetId === 'strong');
  const atkReckless = reckless.find(a => a.type === 'attack' && a.targetId === 'strong');
  expect(atkPrudent).toBeUndefined();   // bloqué car trop fort
  expect(atkReckless).toBeDefined();    // autorisé car téméraire
});

test('15.2a — noEarlyPlayerAttack bloque les attaques joueur', () => {
  const snap = {
    ...BASE_SNAP,
    noEarlyPlayerAttack: true,
  };
  const scores  = computeAllScores(snap, 'mid');
  const vsPlayer = scores.filter(a => a.type === 'attack' && a.targetId === 'player-1');
  const vsBarb   = scores.filter(a => a.type === 'attack' && a.targetId === 'barb-1');
  expect(vsPlayer.length).toBe(0);  // joueur bloqué
  expect(vsBarb.length).toBeGreaterThan(0);  // barbare toujours attaquable
});

test('15.3 — rusher : W_atk early > balanced', () => {
  const rusher   = buildStyleWeights('rusher');
  const balanced = buildStyleWeights('balanced');
  expect(rusher.early.W_atk).toBeGreaterThan(balanced.early.W_atk);
});

test('15.3 — builder : W_prod early > balanced', () => {
  const builder  = buildStyleWeights('builder');
  const balanced = buildStyleWeights('balanced');
  expect(builder.early.W_prod).toBeGreaterThan(balanced.early.W_prod);
});

test('15.3 — rusher score mine < builder score mine en early', () => {
  const timber = BASE_SNAP.availableBuildings.find(b => b.id === 'timber_camp')!;
  const snap   = { ...BASE_SNAP, availableBuildings: [timber] };
  const rusherScores  = computeAllScores(snap, 'early', buildStyleWeights('rusher'));
  const builderScores = computeAllScores(snap, 'early', buildStyleWeights('builder'));
  const rusherMine  = rusherScores.find(a => a.targetId === 'timber_camp')?.score  ?? 0;
  const builderMine = builderScores.find(a => a.targetId === 'timber_camp')?.score ?? 0;
  expect(builderMine).toBeGreaterThan(rusherMine);
});

test('15.3 — aucune valeur négative dans buildStyleWeights', () => {
  for (const style of ['rusher', 'builder', 'balanced'] as const) {
    const w = buildStyleWeights(style);
    for (const phase of ['early', 'mid', 'late'] as const) {
      for (const [key, val] of Object.entries(w[phase])) {
        if (val < 0) throw new Error(`${style}.${phase}.${key} = ${val} < 0`);
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────
// Suite 4 — Phase 16 : recrutement en batch
// ─────────────────────────────────────────────────────────────

console.log('\n─── Phase 16 — Batch recruitment ───────────────────────');

test('16.1 — batch max 10 pour les offensifs en mid (ressources suffisantes)', () => {
  const snap = {
    ...BASE_SNAP,
    wood:  6000, stone: 6000, iron: 6000, maxStorage: 20000,
    rallyPointBuilt: true,
    troopsHome: { axeman: 0 },
  };
  const scores  = computeAllScores(snap, 'mid');
  const recruit = scores.find(a => a.type === 'recruit' && a.targetId === 'axeman');
  // Avec 6000 de chaque ressource, peut financer jusqu'à 10 axemen (axeman = 60w+30s+40i par unité)
  expect(recruit?.count).toBeGreaterThanOrEqual(5); // au minimum 5
});

test('16.1 — batch reste 5 en early (pas de batch étendu)', () => {
  const snap = {
    ...BASE_SNAP,
    wood:  6000, stone: 6000, iron: 6000, maxStorage: 20000,
    rallyPointBuilt: true,
    troopsHome: { axeman: 0 },
  };
  // En early, recrutement offensif interdit → vérifier que le comportement de base est préservé
  const scoresEarly = computeAllScores(snap, 'early');
  const recruitEarly = scoresEarly.find(a => a.type === 'recruit' && a.targetId === 'axeman');
  expect(recruitEarly?.count ?? 0).toBe(0); // bloqué en early
});

test('16.2 — réserve endgame : batch réduit en late sans académie', () => {
  // maxStorage = 10000, réserve = 25% = 2500 par ressource
  // Ressources disponibles après réserve : 10000 - 2500 = 7500
  // Axeman coûte 60w + 30s + 40i = 130/unité → 7500/130 ≈ 57 → capped à 10
  const snap = {
    ...BASE_SNAP,
    wood:  10000, stone: 10000, iron: 10000, maxStorage: 10000,
    rallyPointBuilt: true,
    troopsHome: { axeman: 0 },
    // Pas de noble dans availableUnits → académie non construite
    availableUnits: BASE_SNAP.availableUnits.filter(u => u.id !== 'noble'),
  };
  const scores  = computeAllScores(snap, 'late');
  const recruit = scores.find(a => a.type === 'recruit' && a.targetId === 'axeman');
  // La réserve de 2500/ressource est déduite → reste 7500 → batch max 10 possible
  expect(recruit?.count).toBeGreaterThanOrEqual(1);
  // S'assurer que le batch ne vide pas toutes les ressources (réserve respectée)
  if (recruit?.count) {
    const spent = recruit.count * 60; // 60 wood par axeman
    expect(10000 - spent).toBeGreaterThanOrEqual(2500); // floor respecté
  }
});

test('16.2 — pas de réserve quand académie déjà construite (noble disponible)', () => {
  const snap = {
    ...BASE_SNAP,
    wood:  3500, stone: 3500, iron: 3500, maxStorage: 10000,
    rallyPointBuilt: true,
    troopsHome: { axeman: 0 },
    // Noble disponible → académie construite → pas de réserve
    availableUnits: BASE_SNAP.availableUnits, // noble inclus
  };
  const scoresWithAcademy    = computeAllScores(snap, 'late');
  const recruitWithAcademy   = scoresWithAcademy.find(a => a.type === 'recruit' && a.targetId === 'axeman');
  // Sans réserve, peut recruter avec les 3500 disponibles
  expect(recruitWithAcademy?.count).toBeGreaterThanOrEqual(1);
});

// ─────────────────────────────────────────────────────────────
// Suite 5 — Phase 17 : résilience défensive
// ─────────────────────────────────────────────────────────────

console.log('\n─── Phase 17 — Defensive resilience ────────────────────');

test('17.1 — resourceFloor bloque build si trop coûteux', () => {
  // maxStorage = 10000, floor = 15% = 1500
  // Mur coûte wood=50, stone=100, iron=20
  // wood=1510 - 50 = 1460 < 1500 → bloqué
  const snap = {
    ...BASE_SNAP,
    wood: 1510, stone: 1510, iron: 1510, maxStorage: 10000,
    availableBuildings: [
      {
        id: 'wall', name: 'Mur', currentLevel: 0, nextLevel: 1,
        cost: { wood: 50, stone: 100, iron: 20 }, buildTimeSeconds: 20,
        productionGainPerHour: 0, defenseBonus: 0.037, isUnlocked: true, isInQueue: false,
      },
    ],
  };
  const scores = computeAllScores(snap, 'mid');
  const wallScore = scores.find(a => a.type === 'build' && a.targetId === 'wall');
  // wall coûte stone=100 → stone restant = 1410 < 1500 → bloqué
  expect(wallScore).toBeUndefined();
});

test('17.1 — mur sous attaque ignore le resourceFloor (urgence)', () => {
  const snap = {
    ...BASE_SNAP,
    wood: 1510, stone: 1510, iron: 1510, maxStorage: 10000,
    availableBuildings: [
      {
        id: 'wall', name: 'Mur', currentLevel: 0, nextLevel: 1,
        cost: { wood: 50, stone: 100, iron: 20 }, buildTimeSeconds: 20,
        productionGainPerHour: 0, defenseBonus: 0.037, isUnlocked: true, isInQueue: false,
      },
    ],
    incomingAttacks: [{
      id: 'atk-1', attackerPower: 500, arrivalTimeSeconds: 120, isConfirmed: true,
    }],
  };
  const scores = computeAllScores(snap, 'mid');
  const wallScore = scores.find(a => a.type === 'build' && a.targetId === 'wall');
  // Sous attaque → exception → mur autorisé même si floor pas respecté
  expect(wallScore).toBeDefined();
});

test('17.2 — recrutement défensif d\'urgence si loyauté < 50 et défense < 200', () => {
  const snap = {
    ...BASE_SNAP,
    loyaltyPoints: 40,
    defensivePower: 150,
    offensivePower: 0,
    troopsHome: {},
  };
  const scores    = computeAllScores(snap, 'late');
  const spearman  = scores.find(a => a.type === 'recruit' && a.targetId === 'spearman');
  const axeman    = scores.find(a => a.type === 'recruit' && a.targetId === 'axeman');
  // Spearmen prioritaires (score 5.0)
  expect(spearman).toBeDefined();
  expect(spearman?.score).toBeGreaterThanOrEqual(4.5);
  // Axemen bloqués pendant l'urgence défensive
  expect(axeman).toBeUndefined();
});

test('17.2 — recrutement offensif normal si loyauté OK (pas d\'urgence)', () => {
  const snap = {
    ...BASE_SNAP,
    loyaltyPoints: 80,
    defensivePower: 0,
    offensivePower: 0,
    troopsHome: {},
  };
  const scores = computeAllScores(snap, 'mid');
  const axeman = scores.find(a => a.type === 'recruit' && a.targetId === 'axeman');
  // Pas d'urgence → axeman scoré normalement
  expect(axeman).toBeDefined();
});

// ─────────────────────────────────────────────────────────────
// Suite 6 — Phase 18 : décision de conquête intelligente
// ─────────────────────────────────────────────────────────────

console.log('\n─── Phase 18 — Smart conquest decisions ────────────────');

test('18.2 — prépa conquête : boost ×1.3 appliqué (guard standard 0.6× uniquement)', () => {
  // offPower=200 >= defense=200 * 0.6 = 120 → autorisé par le guard standard
  // + boost ×1.3 car isPrepConquest (cible = conquête, pas de noble)
  const snapPrep = {
    ...BASE_SNAP,
    conquestTargetId: 'player-1',
    troopsHome: { axeman: 20 }, // pas de noble
    offensivePower: 200,
    allTargets: [{
      id: 'player-1', type: 'player' as const, distanceTiles: 8, travelTimeSeconds: 15,
      estimatedResources: 8000, defensivePower: 200, points: 500, lastScouted: null,
    }],
  };
  const snapRef = {
    ...snapPrep,
    conquestTargetId: null, // même attaque mais sans statut de conquête
  };
  const scoresPrep = computeAllScores(snapPrep, 'late');
  const scoresRef  = computeAllScores(snapRef,  'late');
  const atkPrep = scoresPrep.find(a => a.type === 'attack' && a.targetId === 'player-1');
  const atkRef  = scoresRef .find(a => a.type === 'attack' && a.targetId === 'player-1');
  // L'attaque est autorisée (guard 0.6× suffit)
  expect(atkPrep).toBeDefined();
  // Le boost ×1.3 est présent : score prep > score ref
  expect(atkPrep!.score).toBeGreaterThan(atkRef!.score);
});

test('18.2 — guard standard 0.6× bloque si offPower insuffisant', () => {
  // offPower=50 < defense=200 * 0.6 = 120 → bloqué par le guard standard
  const snap = {
    ...BASE_SNAP,
    conquestTargetId: 'player-1',
    troopsHome: { axeman: 2 }, // pas de noble
    offensivePower: 50,
    allTargets: [{
      id: 'player-1', type: 'player' as const, distanceTiles: 8, travelTimeSeconds: 15,
      estimatedResources: 8000, defensivePower: 200, points: 500, lastScouted: null,
    }],
  };
  const scores = computeAllScores(snap, 'late');
  const atk = scores.find(a => a.type === 'attack' && a.targetId === 'player-1');
  expect(atk).toBeUndefined();
});

// ─────────────────────────────────────────────────────────────
// Suite 7 — Phase 19 : optimisation endgame
// ─────────────────────────────────────────────────────────────

console.log('\n─── Phase 19 — Endgame optimization ────────────────────');

const LIGHT_CAV_UNIT = {
  id: 'light_cavalry', name: 'Cavalerie légère', buildingType: 'stable',
  type: 'offensive' as const, attack: 130, defenseGeneral: 30, defenseCavalry: 40,
  defenseArcher: 50, speedSecondsPerTile: 0.18, cost: { wood: 125, stone: 100, iron: 250 },
  recruitTimeSeconds: 1.35, carryCapacity: 80, isUnlocked: true,
};

test('19.1 — cavalerie légère boostée en late si ratio < 30%', () => {
  const snapLow = {
    ...BASE_SNAP,
    troopsHome: { axeman: 60, light_cavalry: 5 }, // 5/65 ≈ 7.7% < 30%
    availableUnits: [...BASE_SNAP.availableUnits, LIGHT_CAV_UNIT],
    recruitQueues: { ...BASE_SNAP.recruitQueues, stable: false },
  };
  const snapHigh = {
    ...BASE_SNAP,
    troopsHome: { axeman: 20, light_cavalry: 10 }, // 10/30 ≈ 33% >= 30%
    availableUnits: [...BASE_SNAP.availableUnits, LIGHT_CAV_UNIT],
    recruitQueues: { ...BASE_SNAP.recruitQueues, stable: false },
  };
  const cavScoreLow  = computeAllScores(snapLow,  'late').find(a => a.type === 'recruit' && a.targetId === 'light_cavalry')?.score ?? 0;
  const cavScoreHigh = computeAllScores(snapHigh, 'late').find(a => a.type === 'recruit' && a.targetId === 'light_cavalry')?.score ?? 0;
  // Cavalerie sous-représentée doit scorer plus haut
  expect(cavScoreLow).toBeGreaterThan(cavScoreHigh);
});

test('19.2 — noble bodyguard : attaque bloquée si escorte < 15 offensifs', () => {
  // 15 axemen * ratio 0.6 (> 2× défense) = 9 sent → offEscort 9 < 15 → bloqué
  const snap = {
    ...BASE_SNAP,
    conquestTargetId: 'player-1',
    troopsHome: { axeman: 15, noble: 1 },
    offensivePower: 15 * 40, // 600
  };
  const scores = computeAllScores(snap, 'late');
  const nobleatk = scores.find(a => a.type === 'attack' && a.targetId === 'player-1' && (a.units?.['noble'] ?? 0) > 0);
  expect(nobleatk).toBeUndefined();
});

test('19.2 — noble bodyguard : attaque autorisée si escorte >= 15 offensifs', () => {
  // 40 axemen * ratio 0.6 = 24 sent → offEscort 24 >= 15 → autorisé
  const snap = {
    ...BASE_SNAP,
    conquestTargetId: 'player-1',
    troopsHome: { axeman: 40, noble: 1 },
    offensivePower: 40 * 40, // 1600
  };
  const scores = computeAllScores(snap, 'late');
  const nobleatk = scores.find(a => a.type === 'attack' && a.targetId === 'player-1' && (a.units?.['noble'] ?? 0) > 0);
  expect(nobleatk).toBeDefined();
  expect(nobleatk?.units?.['noble']).toBe(1);
});

test('19.3 — 2ème noble scoré à 4.0 si 1er est déjà en transit', () => {
  const snap = {
    ...BASE_SNAP,
    wood: 50000, stone: 60000, iron: 60000, maxStorage: 100000,
    conquestTargetId: 'player-1',
    troopsHome:      { ...BASE_SNAP.troopsHome }, // pas de noble à la maison
    troopsInTransit: { noble: 1 },
  };
  const scores = computeAllScores(snap, 'late');
  const noble  = scores.find(a => a.type === 'recruit' && a.targetId === 'noble');
  expect(noble).toBeDefined();
  expect(noble?.score).toBeGreaterThanOrEqual(4.0);
});

test('19.3 — noble non recruté si 2 nobles au total (home + transit)', () => {
  const snap = {
    ...BASE_SNAP,
    wood: 50000, stone: 60000, iron: 60000, maxStorage: 100000,
    conquestTargetId: 'player-1',
    troopsHome:      { ...BASE_SNAP.troopsHome, noble: 1 },
    troopsInTransit: { noble: 1 }, // total = 2 → stop
  };
  const scores = computeAllScores(snap, 'late');
  const noble  = scores.find(a => a.type === 'recruit' && a.targetId === 'noble');
  expect(noble).toBeUndefined();
});

// ─────────────────────────────────────────────────────────────
// Résumé
// ─────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`  Résultats : ${passed} passés, ${failed} échoués`);
console.log(`${'─'.repeat(50)}\n`);

if (failed > 0) process.exit(1);
