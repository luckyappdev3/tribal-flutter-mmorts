// ─────────────────────────────────────────────────────────────
// bot.truel.ts — Simulation à 3 bots simultanés
//
// Usage : npx ts-node src/bot/bot.truel.ts
//
// Trois villages s'affrontent : Alpha (rusher), Beta (builder),
// Gamma (balanced). Chaque bot voit les 2 autres comme cibles.
// ─────────────────────────────────────────────────────────────

import { computeAllScores }            from './bot.scores';
import { evaluatePhase }               from './bot.fsm';
import { buildProfile, buildStyleWeights } from './bot.profile';
import {
  GameSnapshot, ScoredAction, Phase,
  BotStyle, BotBuilding, BotUnit, BotTarget,
} from './bot.types';

// ── Paramètres ────────────────────────────────────────────────

const TOTAL_TICKS     = 500;
const TICK_MINUTES    = 0.75;
const BASE_PROD       = 20;
const TRAVEL_TICKS    = 5;
const CONQUEST_POWER_THRESHOLD = 2000;
const NOBLE_LOYALTY_HIT = 22;

// ── Types internes ────────────────────────────────────────────

interface BuildJob   { buildingId: string; completesAtTick: number; }
interface RecruitJob { unitType: string; count: number; building: string; completesAtTick: number; }
interface PendingAttack {
  fromId:    string;
  toId:      string;
  units:     Record<string, number>;
  arrivesAt: number;
  power:     number;
  hasNoble:  boolean;
}

interface VillageState {
  id:    string;
  name:  string;
  level: number;
  style: BotStyle;
  phase: Phase;
  wood: number; stone: number; iron: number;
  maxStorage: number;
  buildings: Record<string, number>;
  troops: Record<string, number>;
  buildQueue:   BuildJob[];
  recruitQueue: RecruitJob | null;
  loyalty:        number;
  conquestTarget: string | null;
  resourceHistory: { wood: number; stone: number; iron: number }[];
  stats: {
    attacksSent: number; attacksWon: number; attacksLost: number;
    nobleAttacks: number; resourcesLooted: number; resourcesLost: number;
    troopsLost: number; conquests: number;
  };
  lastAttackTick: Map<string, number>;
  scoutMemory:    Map<string, number>;
  // 25.3 — Suivi des défaites consécutives par cible
  consecutiveLossesByTarget: Map<string, number>;
  // 26.3 — Dernière puissance défensive observée par cible
  defenseMemory: Map<string, number>;
  // 27.2 — Tick jusqu'auquel l'attaque sur cette cible est en cooldown
  attackCooldownTick: Map<string, number>;
  // 27.3 — Troupes perdues au dernier combat
  troopsLostLastCombat: number;
  eliminated:     boolean;
}

interface LogEntry { tick: number; villageId: string; phase: Phase; action: string; detail: string; }
const LOG: LogEntry[] = [];
function log(tick: number, v: VillageState, action: string, detail: string) {
  LOG.push({ tick, villageId: v.id, phase: v.phase, action, detail });
}

// ── Bug tracker ───────────────────────────────────────────────

interface BugEntry { tick: number; village: string; type: string; detail: string; }
const BUGS: BugEntry[] = [];
function bug(tick: number, village: string, type: string, detail: string) {
  BUGS.push({ tick, village, type, detail });
  // Afficher en rouge immédiatement
  process.stderr.write(`\x1b[31m[BUG t${tick}] ${village} ${type}: ${detail}\x1b[0m\n`);
}

// ── Définitions des unités ────────────────────────────────────

const UNIT_DEFS: Record<string, BotUnit> = {
  spearman: {
    id: 'spearman', name: 'Lancier', buildingType: 'barracks', type: 'defensive',
    attack: 10, defenseGeneral: 15, defenseCavalry: 45, defenseArcher: 20,
    speedSecondsPerTile: 0.54, cost: { wood: 50, stone: 30, iron: 10 },
    recruitTimeSeconds: 26, carryCapacity: 25, isUnlocked: true,
  },
  axeman: {
    id: 'axeman', name: 'Guerrier', buildingType: 'barracks', type: 'offensive',
    attack: 40, defenseGeneral: 10, defenseCavalry: 5, defenseArcher: 10,
    speedSecondsPerTile: 0.54, cost: { wood: 60, stone: 30, iron: 40 },
    recruitTimeSeconds: 36, carryCapacity: 10, isUnlocked: true,
  },
  scout: {
    id: 'scout', name: 'Éclaireur', buildingType: 'stable', type: 'scout',
    attack: 0, defenseGeneral: 2, defenseCavalry: 1, defenseArcher: 2,
    speedSecondsPerTile: 0.26, cost: { wood: 50, stone: 30, iron: 40 },
    recruitTimeSeconds: 54, carryCapacity: 0, isUnlocked: true,
  },
  noble: {
    id: 'noble', name: 'Noble', buildingType: 'academy', type: 'conquest',
    attack: 0, defenseGeneral: 100, defenseCavalry: 50, defenseArcher: 100,
    speedSecondsPerTile: 1.05, cost: { wood: 4000, stone: 5000, iron: 5000 },
    recruitTimeSeconds: 800, carryCapacity: 0, isUnlocked: true,
  },
};

const UNIT_ATTACK:  Record<string, number> = { axeman: 40, spearman: 10, scout: 0, noble: 0 };
const UNIT_DEFENSE: Record<string, number> = { axeman: 10, spearman: 15, scout: 2, noble: 100 };

function offPow(troops: Record<string, number>): number {
  return Object.entries(troops).reduce((s, [u, n]) => s + n * (UNIT_ATTACK[u] ?? 0), 0);
}
function defPow_(troops: Record<string, number>): number {
  return Object.entries(troops).reduce((s, [u, n]) => s + n * (UNIT_DEFENSE[u] ?? 0), 0);
}

// ── Définitions des bâtiments ─────────────────────────────────

type BuildingCfg = {
  costFn:   (l: number) => { wood: number; stone: number; iron: number };
  timeFn:   (l: number) => number;
  prodFn:   (l: number) => number;
  defFn:    (l: number) => number;
  maxLevel: number;
  unlocked: (v: VillageState) => boolean;
};

const BUILDING_CFGS: Record<string, BuildingCfg> = {
  timber_camp: { costFn: l => ({ wood: 40*(l+1), stone: 50*(l+1), iron: 30*(l+1) }), timeFn: l => 30*(l+1), prodFn: l => (l+1)*BASE_PROD, defFn: _ => 0, maxLevel: 10, unlocked: _ => true },
  quarry:      { costFn: l => ({ wood: 65*(l+1), stone: 40*(l+1), iron: 30*(l+1) }), timeFn: l => 30*(l+1), prodFn: l => (l+1)*BASE_PROD, defFn: _ => 0, maxLevel: 10, unlocked: _ => true },
  iron_mine:   { costFn: l => ({ wood: 75*(l+1), stone: 65*(l+1), iron: 40*(l+1) }), timeFn: l => 35*(l+1), prodFn: l => (l+1)*BASE_PROD, defFn: _ => 0, maxLevel: 10, unlocked: _ => true },
  barracks:    { costFn: l => ({ wood: 200*(l+1), stone: 170*(l+1), iron: 90*(l+1) }), timeFn: l => 60*(l+1), prodFn: _ => 0, defFn: _ => 0, maxLevel: 5, unlocked: _ => true },
  stable:      { costFn: l => ({ wood: 270*(l+1), stone: 240*(l+1), iron: 160*(l+1) }), timeFn: l => 80*(l+1), prodFn: _ => 0, defFn: _ => 0, maxLevel: 5, unlocked: v => (v.buildings['barracks']??0) >= 1 },
  wall:        { costFn: l => ({ wood: 50*(l+1), stone: 100*(l+1), iron: 20*(l+1) }), timeFn: l => 20*(l+1), prodFn: _ => 0, defFn: l => 0.037*(l+1), maxLevel: 20, unlocked: _ => true },
  rally_point: { costFn: _ => ({ wood: 10, stone: 40, iron: 0 }), timeFn: _ => 2, prodFn: _ => 0, defFn: _ => 0, maxLevel: 1, unlocked: _ => true },
  farm:        { costFn: l => ({ wood: 45*(l+1), stone: 40*(l+1), iron: 30*(l+1) }), timeFn: l => 25*(l+1), prodFn: _ => 0, defFn: _ => 0, maxLevel: 30, unlocked: _ => true },
  academy:     { costFn: _ => ({ wood: 3500, stone: 4000, iron: 3000 }), timeFn: _ => 200, prodFn: _ => 0, defFn: _ => 0, maxLevel: 1, unlocked: v => (v.buildings['barracks']??0) >= 1 },
};

function makeBuildingDef(id: string, v: VillageState): BotBuilding | null {
  const cfg = BUILDING_CFGS[id];
  if (!cfg) return null;
  const lvl = v.buildings[id] ?? 0;
  if (lvl >= cfg.maxLevel) return null;
  return {
    id, name: id, currentLevel: lvl, nextLevel: lvl + 1,
    cost: cfg.costFn(lvl), buildTimeSeconds: cfg.timeFn(lvl),
    productionGainPerHour: cfg.prodFn(lvl), defenseBonus: cfg.defFn(lvl),
    isUnlocked: cfg.unlocked(v),
    isInQueue: v.buildQueue.some(j => j.buildingId === id),
  };
}

function computeBottleneck(v: VillageState): 'wood' | 'stone' | 'iron' | null {
  if (v.resourceHistory.length < 3) return null;
  const n = v.resourceHistory.length;
  const ms = v.maxStorage;
  const avgW = v.resourceHistory.reduce((s,r) => s + r.wood  / ms, 0) / n;
  const avgS = v.resourceHistory.reduce((s,r) => s + r.stone / ms, 0) / n;
  const avgI = v.resourceHistory.reduce((s,r) => s + r.iron  / ms, 0) / n;
  const min  = Math.min(avgW, avgS, avgI);
  if (min === avgW) return 'wood';
  if (min === avgS) return 'stone';
  return 'iron';
}

// ── Snapshot multi-cibles ─────────────────────────────────────

function buildSnapshot(v: VillageState, opponents: VillageState[], tick: number): GameSnapshot {
  const buildingIds = ['timber_camp','quarry','iron_mine','barracks','stable','wall','rally_point','farm','academy'];
  const availableBuildings: BotBuilding[] = [];
  for (const id of buildingIds) {
    const b = makeBuildingDef(id, v);
    if (b) availableBuildings.push(b);
  }

  const availableUnits: BotUnit[] = [];
  if ((v.buildings['barracks'] ?? 0) >= 1) {
    availableUnits.push({ ...UNIT_DEFS.spearman });
    availableUnits.push({ ...UNIT_DEFS.axeman });
  }
  if ((v.buildings['stable'] ?? 0) >= 1) availableUnits.push({ ...UNIT_DEFS.scout });
  if ((v.buildings['academy'] ?? 0) >= 1) availableUnits.push({ ...UNIT_DEFS.noble });

  const myOff = offPow(v.troops);

  // 24.2 — Plus de saveForConquest : toujours montrer les cibles.
  // scoreNobleTrain prend la priorité automatiquement quand les nobles sont prêts.
  const targets: BotTarget[] = [];
  for (const opp of opponents) {
    // 26.3 — Utiliser la défense mémorisée si disponible (sinon fallback sur les troupes réelles)
    const oppDefObserved = v.defenseMemory.get(opp.id) ?? defPow_(opp.troops);
    const oppPoints = Object.values(opp.buildings).reduce((s, l) => s + l * 50, 0);
    const oppRes    = (opp.wood + opp.stone + opp.iron) * 0.5;
    targets.push({
      id:                      opp.id,
      type:                    'player',
      distanceTiles:           TRAVEL_TICKS * 5,
      travelTimeSeconds:       TRAVEL_TICKS * 45,
      estimatedResources:      oppRes,
      defensivePower:          oppDefObserved,
      points:                  oppPoints,
      lastScouted:             v.scoutMemory.get(opp.id) ?? null,
      // 27.2 — Cooldown restant vers cette cible
      attackCooldownRemaining: Math.max(0, (v.attackCooldownTick.get(opp.id) ?? 0) - tick),
    });
  }

  // 24.1 — Désigner la cible dès la phase late (l'adversaire le plus faible en défense)
  if (v.phase === 'late' && !v.conquestTarget && opponents.length > 0) {
    const weakest = opponents.reduce((a, b) => defPow_(a.troops) <= defPow_(b.troops) ? a : b);
    v.conquestTarget = weakest.id;
    log(tick, v, 'CONQUEST_TARGET', `Cible → ${weakest.id} (def=${defPow_(weakest.troops)})`);
  }

  // 25.3 — Déverrouillage si ≥3 défaites consécutives : switch vers l'adversaire le plus faible
  if (v.conquestTarget && opponents.length > 0) {
    const losses = v.consecutiveLossesByTarget.get(v.conquestTarget) ?? 0;
    if (losses >= 3) {
      const previous = v.conquestTarget;
      // Choisir le plus faible parmi les AUTRES adversaires
      const alternatives = opponents.filter(x => x.id !== previous);
      const newTarget = alternatives.length > 0
        ? alternatives.reduce((a, b) => defPow_(a.troops) <= defPow_(b.troops) ? a : b)
        : opponents.reduce((a, b) => defPow_(a.troops) <= defPow_(b.troops) ? a : b);
      v.conquestTarget = newTarget.id;
      v.consecutiveLossesByTarget.set(previous, 0);
      log(tick, v, 'TARGET_SWITCH', `${previous.slice(-4)} → ${newTarget.id.slice(-4)} (3 défaites)`);
    }
  }

  const mines = ['timber_camp','quarry','iron_mine'];
  const minesLevel = mines.reduce((s,id) => s+(v.buildings[id]??0),0)/3;
  const rallyBuilt = (v.buildings['rally_point']??0) >= 1;

  const recruitQueues: Record<string, boolean> = {
    barracks: v.recruitQueue?.building === 'barracks',
    stable:   v.recruitQueue?.building === 'stable',
    garage:   false,
    academy:  v.recruitQueue?.building === 'academy',
  };

  const profile = buildProfile(v.level);
  const bottleneck = computeBottleneck(v);
  const waste = profile.resourceWasteRate;
  const visW = Math.min(v.wood,  v.maxStorage) * (1 - waste);
  const visS = Math.min(v.stone, v.maxStorage) * (1 - waste);
  const visI = Math.min(v.iron,  v.maxStorage) * (1 - waste);

  return {
    villageId:           v.id,
    wood:  visW, stone: visS, iron:  visI,
    maxStorage:          v.maxStorage,
    buildQueueCount:     v.buildQueue.length,
    availableBuildings,
    recruitQueues,
    availableUnits,
    allTargets:          targets,
    incomingAttacks:     [],
    outgoingTraveling:   [],
    troopsHome:          { ...v.troops },
    troopsInTransit:     {},
    offensivePower:      myOff,
    defensivePower:      defPow_(v.troops),
    defenseThreshold:    200,
    attackCapacity:      500,
    minesLevel,
    barracksLevel:       v.buildings['barracks'] ?? 0,
    wallLevel:           v.buildings['wall'] ?? 0,
    rallyPointBuilt:     rallyBuilt,
    populationAvailable: 500,
    loyaltyPoints:       v.loyalty,
    bottleneckResource:  bottleneck,
    conquestTargetId:    v.conquestTarget,
    attackRecklessness:  profile.attackRecklessness,
    noEarlyPlayerAttack: v.level <= 3 && tick * TICK_MINUTES < 5,
    timeElapsedMinutes:  tick * TICK_MINUTES,
    alliedVillages:      [],
    // 27.3 — Signal reconstruction : grosse défaite récente
    recentHeavyLoss:     v.troopsLostLastCombat > 10,
  };
}

// ── Résolution d'une attaque ──────────────────────────────────

function resolveAttack(
  atk:      PendingAttack,
  villages: VillageState[],
  tick:     number,
): string | null {
  const attacker = villages.find(v => v.id === atk.fromId);
  const defender = villages.find(v => v.id === atk.toId);

  if (!attacker || !defender) {
    bug(tick, atk.fromId, 'ORPHAN_ATTACK', `attacker=${atk.fromId} defender=${atk.toId} not found`);
    return null;
  }

  const atkPow  = atk.power;
  const defPow  = defPow_(defender.troops);
  // 26.3 — Mémoriser la puissance défensive observée sur cette cible
  attacker.defenseMemory.set(defender.id, defPow);
  const ratio   = atkPow / Math.max(defPow, 1);
  const winProb = 1 - Math.exp(-ratio * 0.8);
  const won     = Math.random() < winProb;

  attacker.stats.attacksSent++;

  if (atk.hasNoble) {
    attacker.stats.nobleAttacks++;
    const before = defender.loyalty;
    defender.loyalty = Math.max(0, defender.loyalty - NOBLE_LOYALTY_HIT);
    log(tick, attacker, 'NOBLE_ATTACK', `Loyauté ${defender.id}: ${before} → ${defender.loyalty}`);
  }

  if (won) {
    attacker.stats.attacksWon++;
    // 27.2 — Cooldown victoire : 3 ticks
    attacker.attackCooldownTick.set(defender.id, tick + 3);
    const defLossRate = Math.min(0.85, ratio * 0.4);
    for (const [u, n] of Object.entries(defender.troops)) {
      const lost = Math.floor(n * defLossRate);
      defender.troops[u] = n - lost;
      defender.stats.troopsLost += lost;
    }
    const carryTotal = Object.entries(atk.units)
      .reduce((s, [u, n]) => s + n * ((UNIT_DEFS[u]?.carryCapacity ?? 10)), 0);
    const loot = Math.min(Math.floor((defender.wood + defender.stone + defender.iron) * 0.33), carryTotal);
    const each = Math.floor(loot / 3);
    defender.wood  = Math.max(0, defender.wood  - each);
    defender.stone = Math.max(0, defender.stone - each);
    defender.iron  = Math.max(0, defender.iron  - each);
    attacker.wood  = Math.min(attacker.maxStorage, attacker.wood  + each);
    attacker.stone = Math.min(attacker.maxStorage, attacker.stone + each);
    attacker.iron  = Math.min(attacker.maxStorage, attacker.iron  + each);
    attacker.stats.resourcesLooted += each * 3;
    defender.stats.resourcesLost   += each * 3;
    let atkLost = 0;
    for (const [u, n] of Object.entries(atk.units)) {
      const lost      = Math.floor(n * 0.15);
      const survivors = n - lost;
      attacker.troops[u] = (attacker.troops[u] ?? 0) + survivors;
      attacker.stats.troopsLost += lost;
      atkLost += lost;
    }
    attacker.troopsLostLastCombat = atkLost;
    // 25.3 — Victoire : reset défaites sur cette cible
    attacker.consecutiveLossesByTarget.set(defender.id, 0);
    log(tick, attacker, 'COMBAT_WIN', `pow=${atkPow} vs def=${defPow} loot=${each*3}`);
  } else {
    attacker.stats.attacksLost++;
    // 27.2 — Cooldown défaite : 15 ticks
    attacker.attackCooldownTick.set(defender.id, tick + 15);
    // 25.3 — Défaite : incrémenter compteur
    const prevLosses = attacker.consecutiveLossesByTarget.get(defender.id) ?? 0;
    attacker.consecutiveLossesByTarget.set(defender.id, prevLosses + 1);
    let atkLost = 0;
    for (const [u, n] of Object.entries(atk.units)) {
      const lost      = Math.floor(n * 0.70);
      const survivors = n - lost;
      attacker.troops[u] = (attacker.troops[u] ?? 0) + survivors;
      attacker.stats.troopsLost += lost;
      atkLost += lost;
    }
    attacker.troopsLostLastCombat = atkLost;
    log(tick, attacker, 'COMBAT_LOSS', `pow=${atkPow} vs def=${defPow}`);
  }

  if (defender.loyalty <= 0) {
    attacker.stats.conquests++;
    log(tick, attacker, '🏆 CONQUEST', `${defender.id} conquis ! (loyauté tombée à 0)`);
    defender.loyalty = 100;
    defender.wood = 0; defender.stone = 0; defender.iron = 0;
    if (atk.hasNoble) {
      attacker.troops['noble'] = Math.max(0, (attacker.troops['noble'] ?? 1) - 1);
    }
    return defender.id;
  }
  return null;
}

// ── Production ────────────────────────────────────────────────

function levelProdMultiplier(level: number): number {
  const l = Math.max(1, Math.min(10, level));
  return 1.0 + (l - 6) * 0.035;
}

function produce(v: VillageState): void {
  const pm = levelProdMultiplier(v.level);
  v.wood  = Math.min(v.maxStorage, v.wood  + (v.buildings['timber_camp']??0) * BASE_PROD * pm);
  v.stone = Math.min(v.maxStorage, v.stone + (v.buildings['quarry']     ??0) * BASE_PROD * pm);
  v.iron  = Math.min(v.maxStorage, v.iron  + (v.buildings['iron_mine']  ??0) * BASE_PROD * pm);
  v.maxStorage = Math.max(4000, (v.buildings['farm'] ?? 1) * 2500);
}

function completeBuildJobs(v: VillageState, tick: number): void {
  const done = v.buildQueue.filter(j => j.completesAtTick <= tick);
  for (const j of done) {
    v.buildings[j.buildingId] = (v.buildings[j.buildingId] ?? 0) + 1;
    log(tick, v, 'BUILD_DONE', `${j.buildingId} → lv${v.buildings[j.buildingId]}`);
  }
  v.buildQueue = v.buildQueue.filter(j => j.completesAtTick > tick);
}

function completeRecruitJobs(v: VillageState, tick: number): void {
  if (v.recruitQueue && v.recruitQueue.completesAtTick <= tick) {
    const { unitType, count } = v.recruitQueue;
    v.troops[unitType] = (v.troops[unitType] ?? 0) + count;
    log(tick, v, 'RECRUIT_DONE', `+${count} ${unitType} → total ${v.troops[unitType]}`);
    v.recruitQueue = null;
  }
}

// ── Application d'une action (avec cible multi-adversaires) ──

function applyAction(
  action:  ScoredAction,
  v:       VillageState,
  villages: VillageState[],
  pending: PendingAttack[],
  tick:    number,
): void {
  // Trouver la cible dans la liste des villages
  const getTarget = (id: string) => villages.find(x => x.id === id);

  switch (action.type) {

    case 'build': {
      const b = makeBuildingDef(action.targetId, v);
      if (!b || v.buildQueue.length >= 2) break;
      if (v.wood < b.cost.wood || v.stone < b.cost.stone || v.iron < b.cost.iron) break;
      v.wood  -= b.cost.wood;
      v.stone -= b.cost.stone;
      v.iron  -= b.cost.iron;
      const ticks = Math.max(1, Math.ceil(b.buildTimeSeconds / 45));
      v.buildQueue.push({ buildingId: action.targetId, completesAtTick: tick + ticks });
      log(tick, v, 'BUILD', `${action.targetId} lv${b.nextLevel} (+${ticks}t) s=${action.score.toFixed(3)}`);
      break;
    }

    case 'recruit': {
      if (v.recruitQueue) break;
      const u = UNIT_DEFS[action.targetId];
      if (!u) break;
      const count = action.count ?? 5;
      if (v.wood < u.cost.wood*count || v.stone < u.cost.stone*count || v.iron < u.cost.iron*count) break;
      v.wood  -= u.cost.wood  * count;
      v.stone -= u.cost.stone * count;
      v.iron  -= u.cost.iron  * count;
      const ticks = Math.max(1, Math.ceil(u.recruitTimeSeconds * count / 45));
      v.recruitQueue = { unitType: u.id, count, building: u.buildingType, completesAtTick: tick + ticks };
      log(tick, v, 'RECRUIT', `×${count} ${u.id} (+${ticks}t) s=${action.score.toFixed(3)}`);
      break;
    }

    case 'attack': {
      const units = action.units ?? {};
      if (Object.values(units).reduce((s,n)=>s+n,0) < 1) break;

      // ── BUG WATCH : targetId valide ?
      const targetVillage = getTarget(action.targetId);
      if (!targetVillage) {
        bug(tick, v.id, 'INVALID_TARGET', `targetId=${action.targetId} inexistant dans villages`);
        break;
      }

      // ── BUG WATCH : s'attaquer soi-même ?
      if (action.targetId === v.id) {
        bug(tick, v.id, 'SELF_ATTACK', `le bot tente de s'attaquer lui-même`);
        break;
      }

      for (const [u, n] of Object.entries(units)) {
        const before = v.troops[u] ?? 0;
        // ── BUG WATCH : troupes négatives ?
        if (before < n) {
          bug(tick, v.id, 'NEGATIVE_TROOPS', `${u}: requested=${n} available=${before} → clamped`);
        }
        v.troops[u] = Math.max(0, before - n);
      }
      const pow      = offPow(units);
      const hasNoble = (units['noble'] ?? 0) > 0;
      pending.push({ fromId: v.id, toId: action.targetId, units, arrivesAt: tick + TRAVEL_TICKS, power: pow, hasNoble });
      v.lastAttackTick.set(action.targetId, tick);
      const label = hasNoble ? '⚔️  NOBLE_SEND' : 'ATTACK';
      log(tick, v, label, `→ ${action.targetId} ${JSON.stringify(units)} pow=${pow} s=${action.score.toFixed(3)}`);
      break;
    }

    case 'scout': {
      // ── BUG WATCH : cibler un village inconnu ?
      const scoutTarget = getTarget(action.targetId);
      if (!scoutTarget) {
        bug(tick, v.id, 'INVALID_SCOUT_TARGET', `targetId=${action.targetId}`);
        break;
      }
      v.scoutMemory.set(action.targetId, Date.now());
      log(tick, v, 'SCOUT', `→ ${action.targetId}`);
      break;
    }

    case 'noble_train': {
      // 24.1 — Noble train : cleaner + nobles en rafale décalée
      const cleanerUnits = action.cleanerUnits ?? {};
      const noblesCount  = action.units?.['noble'] ?? 0;
      if (noblesCount < 1) break;

      // ── BUG WATCH : pas de cible ?
      const trainTarget = getTarget(action.targetId);
      if (!trainTarget) {
        bug(tick, v.id, 'NOBLE_TRAIN_NO_TARGET', `targetId=${action.targetId}`);
        break;
      }

      for (const [u, n] of Object.entries(cleanerUnits)) {
        const before = v.troops[u] ?? 0;
        if (before < n) bug(tick, v.id, 'NEGATIVE_TROOPS', `cleaner ${u}: ${n} > ${before}`);
        v.troops[u] = Math.max(0, before - n);
      }
      v.troops['noble'] = Math.max(0, (v.troops['noble'] ?? 0) - noblesCount);

      // Cleaner d'abord
      const cleanerPow = offPow(cleanerUnits);
      pending.push({
        fromId: v.id, toId: action.targetId, units: cleanerUnits,
        arrivesAt: tick + TRAVEL_TICKS, power: cleanerPow, hasNoble: false,
      });

      // Nobles décalés de 1 tick chacun
      for (let i = 0; i < noblesCount; i++) {
        pending.push({
          fromId: v.id, toId: action.targetId, units: { noble: 1 },
          arrivesAt: tick + TRAVEL_TICKS + 1 + i, power: 0, hasNoble: true,
        });
      }

      v.lastAttackTick.set(action.targetId, tick);
      log(tick, v, '🎯 NOBLE_TRAIN', `→ ${action.targetId} cleaner=${cleanerPow} nobles=${noblesCount}`);
      break;
    }

    case 'idle':
      break;

    default: {
      const unknownType = (action as any).type;
      if (unknownType && unknownType !== 'transfer' && unknownType !== 'recall') {
        bug(tick, v.id, 'UNKNOWN_ACTION', `type=${unknownType}`);
      }
    }
  }

  // Auto-cible de conquête
  const liveOpponents = villages.filter(x => x.id !== v.id);
  if (!v.conquestTarget && (v.buildings['academy'] ?? 0) >= 1 && liveOpponents.length > 0) {
    const weakest = liveOpponents.reduce((a, b) => defPow_(a.troops) <= defPow_(b.troops) ? a : b);
    v.conquestTarget = weakest.id;
    log(tick, v, 'CONQUEST_TARGET', `auto → ${weakest.id}`);
  }
}

// ── Initialisation ────────────────────────────────────────────

function initVillage(id: string, name: string, level: number, style: BotStyle): VillageState {
  const bonusWood  = style === 'builder' ? 400 : 0;
  const bonusIron  = style === 'rusher'  ? 300 : 0;
  return {
    id, name, level, style, phase: 'early',
    wood: 500 + bonusWood, stone: 500, iron: 300 + bonusIron,
    maxStorage: 5000,
    buildings: { timber_camp:1, quarry:1, iron_mine:1, barracks:0, stable:0, wall:0, rally_point:0, farm:4, academy:0 },
    troops: {},
    buildQueue: [], recruitQueue: null,
    loyalty: 100, conquestTarget: null,
    resourceHistory: [],
    stats: { attacksSent:0, attacksWon:0, attacksLost:0, nobleAttacks:0, resourcesLooted:0, resourcesLost:0, troopsLost:0, conquests:0 },
    lastAttackTick: new Map(),
    scoutMemory: new Map(),
    consecutiveLossesByTarget: new Map(),
    defenseMemory: new Map(),
    attackCooldownTick: new Map(),
    troopsLostLastCombat: 0,
    eliminated: false,
  };
}

// ── Simulation ────────────────────────────────────────────────

function simulate() {
  const villages = [
    initVillage('Alpha', 'Alpha', 6, 'rusher'),
    initVillage('Beta',  'Beta',  6, 'builder'),
    initVillage('Gamma', 'Gamma', 6, 'balanced'),
  ];

  const weightsMap = new Map(villages.map(v => [v.id, buildStyleWeights(v.style)]));
  const pending: PendingAttack[] = [];

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  TRUEL À 3 BOTS`);
  console.log(`  Alpha (rusher) vs Beta (builder) vs Gamma (balanced)`);
  console.log(`  ${TOTAL_TICKS} ticks × ${TICK_MINUTES} min`);
  console.log(`${'═'.repeat(64)}\n`);

  for (let tick = 1; tick <= TOTAL_TICKS; tick++) {

    // 1. Production
    for (const v of villages) {
      produce(v);
      v.resourceHistory.push({ wood: v.wood, stone: v.stone, iron: v.iron });
      if (v.resourceHistory.length > 10) v.resourceHistory.shift();
    }

    // 2. Files
    for (const v of villages) {
      completeBuildJobs(v, tick);
      completeRecruitJobs(v, tick);
    }

    // 3. Résoudre attaques
    const arriving = pending.filter(p => p.arrivesAt === tick);
    for (const atk of arriving) {
      resolveAttack(atk, villages, tick);
    }
    pending.splice(0, pending.length, ...pending.filter(p => p.arrivesAt > tick));

    // ── BUG WATCH : attaques en transit depuis un village invalide ─
    for (const p of pending) {
      if (!villages.find(v => v.id === p.fromId)) {
        bug(tick, p.fromId, 'GHOST_ATTACK_IN_TRANSIT', `fromId=${p.fromId} introuvable`);
      }
    }

    // 4. Décisions — ordre aléatoire
    const order = [...villages].sort(() => Math.random() - 0.5);
    for (const v of order) {
      const opponents = villages.filter(x => x.id !== v.id);
      const weights   = weightsMap.get(v.id)!;
      const snap      = buildSnapshot(v, opponents, tick);

      // ── BUG WATCH : snapshot sans cibles en phase late ─────────
      if (v.phase === 'late' && snap.allTargets.length === 0 && (v.troops['noble'] ?? 0) > 0) {
        bug(tick, v.id, 'NO_TARGETS_WITH_NOBLE', `late phase, noble present, but 0 targets in snap`);
      }

      const prevPhase = v.phase;
      v.phase = evaluatePhase(v.phase, snap);
      if (v.phase !== prevPhase) {
        log(tick, v, 'PHASE_CHANGE', `${prevPhase} → ${v.phase}`);
      }

      const profile  = buildProfile(v.level);
      const epsilon  = profile.scoreNoiseEpsilon;

      let candidates;
      try {
        candidates = computeAllScores(snap, v.phase, weights)
          .map(a => ({ ...a, score: a.score * (1 - epsilon + Math.random() * 2 * epsilon) }));
      } catch (e: any) {
        bug(tick, v.id, 'SCORE_ENGINE_CRASH', e.message ?? String(e));
        continue;
      }

      if (candidates.length === 0) {
        bug(tick, v.id, 'EMPTY_CANDIDATES', `computeAllScores retourné 0 actions`);
        continue;
      }

      const best = candidates.reduce((a, b) => a.score > b.score ? a : b);

      // ── BUG WATCH : score NaN ou négatif ──────────────────────
      if (isNaN(best.score)) {
        bug(tick, v.id, 'NAN_SCORE', `best action type=${best.type} score=NaN`);
        continue;
      }
      if (best.score < 0) {
        bug(tick, v.id, 'NEGATIVE_SCORE', `best action type=${best.type} score=${best.score}`);
      }

      applyAction(best, v, opponents, pending, tick);
    }

    // 5. Rapport de progression tous les 100 ticks
    if (tick % 100 === 0) {
      console.log(`── tick ${tick} ───────────────────────────────────────────────`);
      for (const v of villages) {
        const off = offPow(v.troops);
        const def = defPow_(v.troops);
        console.log(`  ${v.name.padEnd(6)} [${v.phase.padEnd(5)}] off=${String(off).padStart(5)} def=${String(def).padStart(5)} axe=${v.troops['axeman']??0} noble=${v.troops['noble']??0} loy=${v.loyalty}`);
      }
      console.log(`  pending attacks: ${pending.length}`);
      console.log(`  bugs so far    : ${BUGS.length}`);
      console.log('');
    }
  }

  return villages;
}

// ── Rapport final ─────────────────────────────────────────────

function report(villages: VillageState[]) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  RÉSULTAT FINAL — TRUEL`);
  console.log(`${'═'.repeat(64)}\n`);

  for (const v of villages) {
    const winRate = v.stats.attacksSent > 0 ? (v.stats.attacksWon / v.stats.attacksSent * 100).toFixed(0) : '—';
    const minesAvg = (['timber_camp','quarry','iron_mine'] as const).reduce((s,id) => s+(v.buildings[id]??0),0) / 3;
    console.log(`  ${v.name} (nv${v.level}, ${v.style})`);
    console.log(`    Phase          : ${v.phase}`);
    console.log(`    Ressources     : bois=${Math.floor(v.wood)} pierre=${Math.floor(v.stone)} fer=${Math.floor(v.iron)}`);
    console.log(`    Troupes        : axe=${v.troops['axeman']??0} spear=${v.troops['spearman']??0} noble=${v.troops['noble']??0}`);
    console.log(`    Bâtiments      : barracks=${v.buildings['barracks']??0} academy=${v.buildings['academy']??0} wall=${v.buildings['wall']??0} mines≈lv${minesAvg.toFixed(1)}`);
    console.log(`    Loyauté        : ${v.loyalty}/100`);
    console.log(`    Attaques       : ${v.stats.attacksSent} env | ${v.stats.attacksWon} won | ${v.stats.attacksLost} lost | win=${winRate}%`);
    console.log(`    Noble attacks  : ${v.stats.nobleAttacks}`);
    console.log(`    Conquêtes      : ${v.stats.conquests}`);
    console.log(`    Pillages nets  : +${v.stats.resourcesLooted} / -${v.stats.resourcesLost}`);
    console.log(`    Troupes perdues: ${v.stats.troopsLost}`);
    console.log('');
  }

  // Journal des événements importants
  const IMPORTANT = new Set(['🎯 NOBLE_TRAIN','NOBLE_ATTACK','🏆 CONQUEST','PHASE_CHANGE','CONQUEST_TARGET']);
  const nameMap = new Map(villages.map(v => [v.id, `${v.name}[${v.style}]`]));
  console.log('── Journal des événements clés ──────────────────────────────\n');
  for (const e of LOG.filter(e => IMPORTANT.has(e.action)).slice(-80)) {
    const who    = nameMap.get(e.villageId) ?? e.villageId;
    const action = e.action.padEnd(16);
    const line   = `  t${String(e.tick).padStart(3)} [${e.phase.padEnd(5)}] ${who.padEnd(20)} ${action} ${e.detail}`;
    if (e.action.includes('CONQUEST') || e.action.includes('NOBLE') || e.action.includes('PHASE')) {
      console.log(`\x1b[33m${line}\x1b[0m`);
    } else {
      console.log(line);
    }
  }

  // ── Rapport des bugs ──────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  BUGS DÉTECTÉS : ${BUGS.length}`);
  console.log(`${'═'.repeat(64)}\n`);

  if (BUGS.length === 0) {
    console.log('  ✅ Aucun bug détecté dans cette simulation.\n');
  } else {
    const grouped = new Map<string, BugEntry[]>();
    for (const b of BUGS) {
      const list = grouped.get(b.type) ?? [];
      list.push(b);
      grouped.set(b.type, list);
    }
    for (const [type, entries] of grouped) {
      console.log(`  ❌ ${type} — ${entries.length} occurrence(s)`);
      // Montrer jusqu'à 3 exemples
      for (const e of entries.slice(0, 3)) {
        console.log(`     t${e.tick} [${e.village}] ${e.detail}`);
      }
      console.log('');
    }
  }

  // ── Analyse ───────────────────────────────────────────────────
  console.log(`${'═'.repeat(64)}`);
  console.log(`  ANALYSE PAR BOT`);
  console.log(`${'═'.repeat(64)}\n`);

  for (const v of villages) {
    const myLogs = LOG.filter(e => e.villageId === v.id);
    const noblePhase = myLogs.find(e => e.action === 'PHASE_CHANGE' && e.detail.includes('late'))?.tick;
    const firstNoble = myLogs.find(e => e.action === '🎯 NOBLE_TRAIN' || e.action === '⚔️  NOBLE_SEND')?.tick;
    const firstConquest = myLogs.find(e => e.action === '🏆 CONQUEST')?.tick;
    const firstAttack = myLogs.find(e => e.action === 'ATTACK')?.tick;
    const hasAcademy = (v.buildings['academy'] ?? 0) >= 1;
    const hasStable = (v.buildings['stable'] ?? 0) >= 1;

    console.log(`  ── ${v.name} (${v.style}) ──────────────────────────`);
    console.log(`    Phase late atteinte : ${noblePhase ? `t${noblePhase}` : 'JAMAIS'}`);
    console.log(`    Première attaque    : ${firstAttack ? `t${firstAttack}` : 'JAMAIS'}`);
    console.log(`    Premier noble envoyé: ${firstNoble ? `t${firstNoble}` : 'JAMAIS'}`);
    console.log(`    Conquête réalisée   : ${firstConquest ? `t${firstConquest}` : 'JAMAIS'}`);
    console.log(`    Académie construite : ${hasAcademy ? '✅' : '❌'}`);
    console.log(`    Écurie construite   : ${hasStable  ? '✅' : '⚠️  non'}`);
    console.log('');
  }
}

// ── Point d'entrée ────────────────────────────────────────────

const villages = simulate();
report(villages);
