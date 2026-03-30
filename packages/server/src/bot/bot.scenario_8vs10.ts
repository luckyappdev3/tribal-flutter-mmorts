// ─────────────────────────────────────────────────────────────
// bot.scenario_8vs10.ts — Simulation Haut Niveau
// Usage : npx ts-node packages/server/src/bot/bot.scenario_8vs10.ts
// ─────────────────────────────────────────────────────────────

import { simulate, report } from './bot.duel';

console.log('\n⚔️  LANCEMENT DU TEST : NIVEAU 8 (Expert) VS NIVEAU 10 (Maître)');

const result = simulate('balanced', 8, 'balanced', 10);
report(result.A, result.B, result.conquestAt, result.conqueror);

console.log('\nSimulation terminée.');