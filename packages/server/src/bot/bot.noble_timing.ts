// bot.noble_timing.ts — Calcul analytique du timing du premier noble
// Usage : npx ts-node src/bot/bot.noble_timing.ts
//
// Simule la file de construction critique pour atteindre le noble,
// en utilisant les vraies formules du jeu (building.formulas.ts + production.formulas.ts).
// Pas de réseau, pas de DB — calcul pur.

import * as path from 'path';
import * as fs   from 'fs';

// ── Formules (copie inline pour éviter les imports circulaires) ──

function buildTime(baseBuildTime: number, timeMultiplier: number, level: number): number {
  if (level === 1) return baseBuildTime;
  return Math.floor(baseBuildTime * Math.pow(timeMultiplier, level - 1));
}

function getHourlyProduction(level: number): number {
  if (level <= 0) return 5;
  return Math.floor(30 * Math.pow(1.155, level - 1));
}

function calcMaxStorage(level: number): number {
  if (level <= 0) return 1000;
  return Math.floor(1000 * Math.pow(1.2295, level - 1));
}

// ── Chargement des définitions JSON ─────────────────────────────

const DATA_DIR = '/Users/yildirim/tribal-flutterV4/mmorts/packages/shared/game-data/buildings';

function loadDef(id: string): any {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${id}.json`), 'utf8'));
}

const defs: Record<string, any> = {};
for (const file of fs.readdirSync(DATA_DIR)) {
  const id = file.replace('.json', '');
  defs[id] = loadDef(id);
}

// ── Simulation ───────────────────────────────────────────────────

function simulate(gameSpeed: number) {
  // État initial (identique au smoke test)
  const buildings: Record<string, number> = {
    headquarters: 5,
    timber_camp:  3,
    quarry:       3,
    iron_mine:    3,
    warehouse:    3,
    barracks:     3,
    smith:        3,
    rally_point:  1,
    stable:       2,
    wall:         2,
    farm:         4,
  };

  let wood  = 500;
  let stone = 500;
  let iron  = 400;
  let timeS = 0; // temps écoulé en secondes

  // Production horaire totale (3 mines)
  function prodPerSecond() {
    const wood_ps  = getHourlyProduction(buildings.timber_camp)  * gameSpeed / 3600;
    const stone_ps = getHourlyProduction(buildings.quarry)        * gameSpeed / 3600;
    const iron_ps  = getHourlyProduction(buildings.iron_mine)     * gameSpeed / 3600;
    return { wood_ps, stone_ps, iron_ps };
  }

  function maxStorage() {
    return calcMaxStorage(buildings.warehouse ?? 1);
  }

  // Construire un bâtiment au niveau suivant
  // Retourne le temps réel écoulé (attente ressources + construction)
  function build(buildingId: string) {
    const def = defs[buildingId];
    const currentLevel = buildings[buildingId] ?? 0;
    const nextLevel    = currentLevel + 1;

    // Coût
    const mult = Math.pow(def.baseStats.costMultiplier, Math.max(0, nextLevel - 1));
    const cost = {
      wood:  Math.floor(def.baseStats.baseCost.wood  * (nextLevel === 1 ? 1 : mult)),
      stone: Math.floor(def.baseStats.baseCost.stone * (nextLevel === 1 ? 1 : mult)),
      iron:  Math.floor(def.baseStats.baseCost.iron  * (nextLevel === 1 ? 1 : mult)),
    };

    // Attendre les ressources si insuffisantes
    const { wood_ps, stone_ps, iron_ps } = prodPerSecond();
    const waitW = cost.wood  > wood  ? (cost.wood  - wood)  / wood_ps  : 0;
    const waitS = cost.stone > stone ? (cost.stone - stone) / stone_ps : 0;
    const waitI = cost.iron  > iron  ? (cost.iron  - iron)  / iron_ps  : 0;
    const waitRes = Math.max(waitW, waitS, waitI);

    if (waitRes > 0) {
      // Accumulation des ressources pendant l'attente
      const ms = maxStorage();
      wood  = Math.min(ms, wood  + wood_ps  * waitRes);
      stone = Math.min(ms, stone + stone_ps * waitRes);
      iron  = Math.min(ms, iron  + iron_ps  * waitRes);
      timeS += waitRes;
    }

    // Dépenser
    wood  -= cost.wood;
    stone -= cost.stone;
    iron  -= cost.iron;

    // Durée de construction avec réduction HQ
    const hqReduction = Math.min(0.95, (buildings.headquarters ?? 0) * 0.05);
    const rawTime = buildTime(def.baseStats.baseBuildTime, def.baseStats.timeMultiplier, nextLevel);
    const effectiveTime = rawTime * (1 - hqReduction) / gameSpeed;

    // Accumulation pendant la construction
    const ms2 = maxStorage();
    wood  = Math.min(ms2, wood  + wood_ps  * effectiveTime);
    stone = Math.min(ms2, stone + stone_ps * effectiveTime);
    iron  = Math.min(ms2, iron  + iron_ps  * effectiveTime);
    timeS += effectiveTime;

    buildings[buildingId] = nextLevel;
  }

  // ── Chemin critique vers le noble ───────────────────────────
  // Prérequis noble: HQ20 + smith20 + market10 + snob1
  // Prérequis snob: HQ20, smith20, market10
  // Prérequis market: HQ10, warehouse10
  // On construit en séquence optimale (simplification : une file)

  const steps: string[] = [];

  // 1. Monter HQ jusqu'à 10 (prérequis market)
  while ((buildings.headquarters ?? 0) < 10) {
    const before = timeS;
    build('headquarters');
    steps.push(`HQ lv${buildings.headquarters} → +${(timeS - before).toFixed(1)}s  (t=${timeS.toFixed(1)}s)`);
  }

  // 2. Monter warehouse jusqu'à 10 (prérequis market) en parallèle HQ
  while ((buildings.warehouse ?? 0) < 10) {
    const before = timeS;
    build('warehouse');
    steps.push(`Warehouse lv${buildings.warehouse} → +${(timeS - before).toFixed(1)}s  (t=${timeS.toFixed(1)}s)`);
  }

  // 3. Construire market jusqu'à 10
  while ((buildings.market ?? 0) < 10) {
    const before = timeS;
    build('market');
    steps.push(`Market lv${buildings.market} → +${(timeS - before).toFixed(1)}s  (t=${timeS.toFixed(1)}s)`);
  }

  // 4. Monter HQ jusqu'à 20
  while ((buildings.headquarters ?? 0) < 20) {
    const before = timeS;
    build('headquarters');
    steps.push(`HQ lv${buildings.headquarters} → +${(timeS - before).toFixed(1)}s  (t=${timeS.toFixed(1)}s)`);
  }

  // 5. Monter smith jusqu'à 20
  while ((buildings.smith ?? 0) < 20) {
    const before = timeS;
    build('smith');
    steps.push(`Smith lv${buildings.smith} → +${(timeS - before).toFixed(1)}s  (t=${timeS.toFixed(1)}s)`);
  }

  // 6. Construire snob lv1
  {
    const before = timeS;
    build('snob');
    steps.push(`Snob lv1 → +${(timeS - before).toFixed(1)}s  (t=${timeS.toFixed(1)}s)`);
  }

  // 7. Recruter 1 noble
  // T_reel = recruitTime * 0.94^(snobLevel-1) / gameSpeed  (snob lv1 → 0.94^0 = 1)
  const NOBLE_RECRUIT_TIME = 35700; // secondes base
  const snobLevel = buildings.snob ?? 1;
  const nobleTimeS = NOBLE_RECRUIT_TIME * Math.pow(0.94, snobLevel - 1) / gameSpeed;

  // Attendre les ressources du noble (40000w, 50000s, 50000i)
  const nobleCost = { wood: 40000, stone: 50000, iron: 50000 };
  const { wood_ps, stone_ps, iron_ps } = prodPerSecond();
  const waitW = nobleCost.wood  > wood  ? (nobleCost.wood  - wood)  / wood_ps  : 0;
  const waitS = nobleCost.stone > stone ? (nobleCost.stone - stone) / stone_ps : 0;
  const waitI = nobleCost.iron  > iron  ? (nobleCost.iron  - iron)  / iron_ps  : 0;
  const waitNobleRes = Math.max(waitW, waitS, waitI);
  timeS += waitNobleRes;

  const beforeNoble = timeS;
  timeS += nobleTimeS;
  steps.push(`Noble recrutement → +${nobleTimeS.toFixed(1)}s  (t=${timeS.toFixed(1)}s)`);

  return { totalSeconds: timeS, steps, nobleTimeS, waitNobleRes };
}

// ── Affichage ────────────────────────────────────────────────────

for (const gs of [200, 2000]) {
  const { totalSeconds, steps, nobleTimeS, waitNobleRes } = simulate(gs);

  const fmt = (s: number) => {
    if (s < 60) return `${s.toFixed(1)}s`;
    if (s < 3600) return `${(s/60).toFixed(1)} min`;
    return `${(s/3600).toFixed(2)} h`;
  };

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  GAMESPEED × ${gs}`);
  console.log(`${'═'.repeat(60)}`);
  // Afficher les 10 dernières étapes + totaux
  const show = steps.slice(-15);
  if (steps.length > 15) console.log(`  ... (${steps.length - 15} étapes précédentes) ...`);
  for (const s of show) console.log('  ' + s);
  console.log(`\n  Attente ressources noble : ${fmt(waitNobleRes)}`);
  console.log(`  Recrutement noble        : ${fmt(nobleTimeS)}`);
  console.log(`\n  ⏱️  PREMIER NOBLE ENVOYÉ après : ${fmt(totalSeconds)} (temps réel)`);
}
