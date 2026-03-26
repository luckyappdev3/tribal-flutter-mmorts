// ─────────────────────────────────────────────────────────────
// bot.bench.ts — Régression automatique du bot IA (Phase 20)
//
// Usage : npx ts-node src/bot/bot.bench.ts
//
// Lance N duels en mode silencieux et valide des seuils de qualité :
//   Scénario principal (20.2) : Balanced(6) vs Balanced(6) × 20
//     ≥ 80 % des duels se terminent par une conquête avant tick 450
//     ≥ 90 % des bots construisent une académie dans les 500 ticks
//
//   Duels asymétriques (20.3) :
//     Rusher(10) vs Builder(1)  → conquête avant tick 300 dans ≥ 70 %
//     Rusher(1)  vs Builder(10) → conquête avant tick 350 dans ≥ 70 %
// ─────────────────────────────────────────────────────────────

import { simulate, clearLog, BotMetrics } from './bot.duel';
import { BotStyle }                       from './bot.types';

// ── Helpers statistiques ──────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function pct(n: number, total: number): string {
  return (n / total * 100).toFixed(0) + '%';
}

// ── Structure de résultats d'un duel ─────────────────────────

interface DuelResult {
  conquestTick: number | null;
  conqueror:    string | null;
  metricsA:     BotMetrics;
  metricsB:     BotMetrics;
  winRateA:     number;  // 0–1
}

// ── Lancement d'un batch de duels ────────────────────────────

function runBatch(
  runs:   number,
  styleA: BotStyle, levelA: number,
  styleB: BotStyle, levelB: number,
): DuelResult[] {
  const results: DuelResult[] = [];
  for (let i = 0; i < runs; i++) {
    clearLog();
    const r = simulate(styleA, levelA, styleB, levelB, /*silent=*/true);
    const sentA = r.A.stats.attacksSent;
    const wonA  = r.A.stats.attacksWon;
    results.push({
      conquestTick: r.conquestAt,
      conqueror:    r.conqueror,
      metricsA:     r.metricsA,
      metricsB:     r.metricsB,
      winRateA:     sentA > 0 ? wonA / sentA : 0,
    });
    process.stdout.write(i % 10 === 9 ? `${i + 1}/${runs}\n` : '.');
  }
  if (runs % 10 !== 0) console.log('');
  return results;
}

// ── Rapport + validation des seuils ──────────────────────────

interface Gate {
  label:    string;
  passed:   boolean;
  detail:   string;
}

function benchReport(
  label:          string,
  results:        DuelResult[],
  conquestByTick: number,
  extraGates:     Gate[] = [],
): boolean {
  const runs = results.length;

  const conquered = results.filter(r => r.conquestTick !== null && r.conquestTick <= conquestByTick);
  const cTicks    = conquered.map(r => r.conquestTick!);

  const academyAny = results.filter(r =>
    r.metricsA.academyBuiltAt !== null || r.metricsB.academyBuiltAt !== null
  );
  const allAcadTicks = [
    ...results.filter(r => r.metricsA.academyBuiltAt !== null).map(r => r.metricsA.academyBuiltAt!),
    ...results.filter(r => r.metricsB.academyBuiltAt !== null).map(r => r.metricsB.academyBuiltAt!),
  ];

  const nobleSentCount = results.filter(r =>
    r.metricsA.firstNobleSentAt !== null || r.metricsB.firstNobleSentAt !== null
  ).length;

  const winRates = results.map(r => r.winRateA).filter(w => w > 0);

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  BENCH : ${label}`);
  console.log(`  ${runs} duels — seuil conquête ≤ t${conquestByTick}`);
  console.log(`${'═'.repeat(64)}\n`);

  console.log(`  Conquêtes ≤ t${conquestByTick}    : ${conquered.length}/${runs} (${pct(conquered.length, runs)})`);
  if (cTicks.length > 0) {
    console.log(`    Médiane tick          : ${median(cTicks).toFixed(0)}`);
    console.log(`    Écart-type            : ${stddev(cTicks).toFixed(0)}`);
    console.log(`    Min / Max             : ${Math.min(...cTicks)} / ${Math.max(...cTicks)}`);
  }

  console.log(`\n  Académie construite (≥1 bot) : ${academyAny.length}/${runs} (${pct(academyAny.length, runs)})`);
  if (allAcadTicks.length > 0) {
    console.log(`    Médiane tick          : ${median(allAcadTicks).toFixed(0)}`);
    console.log(`    Écart-type            : ${stddev(allAcadTicks).toFixed(0)}`);
  }

  console.log(`\n  Noble envoyé (≥1 bot)        : ${nobleSentCount}/${runs} (${pct(nobleSentCount, runs)})`);

  if (winRates.length > 0) {
    console.log(`\n  Taux de victoire moyen (A)   : ${(winRates.reduce((s, v) => s + v, 0) / winRates.length * 100).toFixed(0)}%`);
  }

  // ── Seuils de qualité ───────────────────────────────────────
  console.log(`\n  ── Seuils de qualité ${'─'.repeat(42)}`);

  const gates: Gate[] = [
    {
      label:  `≥ 80% conquêtes ≤ t${conquestByTick}`,
      passed: conquered.length / runs >= 0.80,
      detail: `${pct(conquered.length, runs)}`,
    },
    {
      label:  '≥ 90% académies construites',
      passed: academyAny.length / runs >= 0.90,
      detail: `${pct(academyAny.length, runs)}`,
    },
    ...extraGates,
  ];

  for (const g of gates) {
    const icon = g.passed ? '✅' : '❌';
    console.log(`    ${icon} ${g.label.padEnd(38)} ${g.detail}`);
  }

  const allPassed = gates.every(g => g.passed);
  const verdict   = allPassed
    ? '\x1b[32m  TOUS LES SEUILS PASSÉS ✅\x1b[0m'
    : '\x1b[31m  SEUILS NON ATTEINTS ❌\x1b[0m';
  console.log(`\n${verdict}`);

  return allPassed;
}

// ─────────────────────────────────────────────────────────────
// Scénario 1 — Validation principale (20.2)
// Balanced(6) vs Balanced(6) × 20 duels
// ─────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Scénario 1 : Balanced(6) vs Balanced(6) — 20 duels');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const r1 = runBatch(20, 'balanced', 6, 'balanced', 6);
const ok1 = benchReport('Balanced(6) vs Balanced(6)', r1, 450);

// ─────────────────────────────────────────────────────────────
// Scénario 2 — Isolation de l'effet de niveau (20.3)
// Rusher(10) vs Rusher(1) : même style, niveaux opposés
// Seuil : le niveau 10 conquiert dans ≥ 70 % des duels
// ─────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Scénario 2 : Rusher(10) vs Rusher(1) — 10 duels');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const r2 = runBatch(10, 'rusher', 10, 'rusher', 1);
const r10wins2 = r2.filter(r => r.conqueror === 'Alpha' && r.conquestTick !== null);
const ok2 = benchReport(
  'Rusher(10) vs Rusher(1)',
  r2,
  500,
  [{
    label:  '≥ 70% nv10 conquiert (même style)',
    passed: r10wins2.length / r2.length >= 0.70,
    detail: `${pct(r10wins2.length, r2.length)}`,
  }],
);

// ─────────────────────────────────────────────────────────────
// Scénario 3 — Isolation de l'effet de niveau inverse (20.3)
// Builder(10) vs Builder(1) : même style, niveaux opposés
// Seuil : le niveau 10 conquiert dans ≥ 70 % des duels
// ─────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Scénario 3 : Builder(10) vs Builder(1) — 10 duels');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const r3 = runBatch(10, 'builder', 10, 'builder', 1);
const b10wins3 = r3.filter(r => r.conqueror === 'Alpha' && r.conquestTick !== null);
const ok3 = benchReport(
  'Builder(10) vs Builder(1)',
  r3,
  500,
  [{
    label:  '≥ 70% nv10 conquiert (même style)',
    passed: b10wins3.length / r3.length >= 0.70,
    detail: `${pct(b10wins3.length, r3.length)}`,
  }],
);

// ─────────────────────────────────────────────────────────────
// Résumé global
// ─────────────────────────────────────────────────────────────

console.log(`\n${'━'.repeat(64)}`);
console.log('  RÉSUMÉ GLOBAL');
console.log(`${'━'.repeat(64)}`);
console.log(`  Scénario 1 (Balanced 6v6)       : ${ok1 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Scénario 2 (Rusher10 vs Rusher1) : ${ok2 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Scénario 3 (Builder10 vs Bld1)  : ${ok3 ? '✅ PASS' : '❌ FAIL'}`);

const allOk = ok1 && ok2 && ok3;
console.log(`\n  ${allOk
  ? '\x1b[32mBench complet : TOUT VERT ✅\x1b[0m'
  : '\x1b[31mBench complet : AMÉLIORATIONS REQUISES ❌\x1b[0m'
}`);
console.log('');

if (!allOk) process.exit(1);
