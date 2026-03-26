// ─────────────────────────────────────────────────────────────
// bot.duel.ts — Simulation de duel jusqu'à l'endgame (conquête)
//
// Usage : npx ts-node src/bot/bot.duel.ts
//
// Deux villages s'affrontent sur N ticks. L'objectif :
// atteindre l'endgame — académie → noble → attaques de conquête.
// Un village est conquis quand sa loyauté tombe à 0.
// ─────────────────────────────────────────────────────────────

import { computeAllScores }            from './bot.scores';
import { evaluatePhase }               from './bot.fsm';
import { buildProfile, buildStyleWeights } from './bot.profile';
import {
  GameSnapshot, ScoredAction, Phase,
  BotStyle, BotBuilding, BotUnit, BotTarget, PhaseWeights,
} from './bot.types';

// ── Paramètres ────────────────────────────────────────────────

const TOTAL_TICKS     = 500;   // 500 × 0.75 min = 375 min simulées
const TICK_MINUTES    = 0.75;
const BASE_PROD       = 20;    // ressources/tick par niveau de mine
const TRAVEL_TICKS    = 5;     // aller simple entre les deux villages
const NOISE_EPSILON   = 0.07;
// Seuil de puissance pour débloquer l'accumulation en vue de la conquête
// (50 axemen × 40 atk = 2000) — le bot accumule jusqu'à ce seuil avant d'attaquer
const CONQUEST_POWER_THRESHOLD = 2000;
// Réduction de loyauté par attaque avec noble
const NOBLE_LOYALTY_HIT = 22;

// ── Types internes ────────────────────────────────────────────

interface BuildJob   { buildingId: string; completesAtTick: number; }
interface RecruitJob { unitType: string; count: number; building: string; completesAtTick: number; }
interface PendingAttack {
  fromId:        string;
  units:         Record<string, number>;
  arrivesAt:     number;
  power:         number;
  hasNoble:      boolean;
}

interface VillageState {
  id:    string;
  name:  string;
  level: number;
  style: BotStyle;
  phase: Phase;
  // Ressources
  wood: number; stone: number; iron: number;
  maxStorage: number;
  // Bâtiments (niveau actuel)
  buildings: Record<string, number>;
  // Troupes à la maison
  troops: Record<string, number>;
  // Files
  buildQueue:   BuildJob[];
  recruitQueue: RecruitJob | null;
  // Conquête
  loyalty:        number;   // 0 → conquis
  conquestTarget: string | null;
  // Historique ressources (bottleneck detection)
  resourceHistory: { wood: number; stone: number; iron: number }[];
  // Statistiques
  stats: {
    attacksSent:    number;
    attacksWon:     number;
    attacksLost:    number;
    nobleAttacks:   number;
    resourcesLooted: number;
    resourcesLost:   number;
    troopsLost:     number;
    conquests:      number;
  };
  // Cooldowns
  lastAttackTick: Map<string, number>;
  scoutMemory:    Map<string, number>;
  // 25.3 — Suivi des défaites consécutives par cible (déverrouillage si ≥3)
  consecutiveLossesByTarget: Map<string, number>;
  // 26.3 — Dernière puissance défensive observée par cible (mise à jour après combat)
  defenseMemory: Map<string, number>;
  // 27.2 — Tick jusqu'auquel l'attaque sur cette cible est en cooldown
  attackCooldownTick: Map<string, number>;
  // 27.3 — Troupes perdues au dernier combat (reset à chaque résolution)
  troopsLostLastCombat: number;
}

interface LogEntry {
  tick:      number;
  villageId: string;
  phase:     Phase;
  action:    string;
  detail:    string;
}

const LOG: LogEntry[] = [];
export function clearLog(): void { LOG.length = 0; }
function log(tick: number, v: VillageState, action: string, detail: string) {
  LOG.push({ tick, villageId: v.id, phase: v.phase, action, detail });
}

// ── Métriques par village (20.1) ──────────────────────────────

export interface BotMetrics {
  academyBuiltAt:   number | null;
  nobleRecruitedAt: number | null;
  firstNobleSentAt: number | null;
  firstAttackAt:    number | null;
}

function extractMetrics(villageId: string): BotMetrics {
  const ml = LOG.filter(e => e.villageId === villageId);
  return {
    academyBuiltAt:   ml.find(e => e.action === 'BUILD_DONE'    && e.detail.includes('academy'))?.tick ?? null,
    nobleRecruitedAt: ml.find(e => e.action === 'RECRUIT_DONE'  && e.detail.includes('noble'))?.tick   ?? null,
    firstNobleSentAt: ml.find(e => e.action === '⚔️  NOBLE_SEND')?.tick ?? null,
    firstAttackAt:    ml.find(e => e.action === 'ATTACK')?.tick         ?? null,
  };
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
function defPow(troops: Record<string, number>): number {
  return Object.entries(troops).reduce((s, [u, n]) => s + n * (UNIT_DEFENSE[u] ?? 0), 0);
}
function offTroopsCount(troops: Record<string, number>): number {
  const OFF = new Set(['axeman']);
  return Object.entries(troops).filter(([u]) => OFF.has(u)).reduce((s, [,n]) => s + n, 0);
}

// ── Définitions des bâtiments ─────────────────────────────────

type BuildingCfg = {
  costFn:   (l: number) => { wood: number; stone: number; iron: number };
  timeFn:   (l: number) => number;   // secondes
  prodFn:   (l: number) => number;   // prod par tick
  defFn:    (l: number) => number;
  maxLevel: number;
  unlocked: (v: VillageState) => boolean;
};

const BUILDING_CFGS: Record<string, BuildingCfg> = {
  timber_camp: {
    costFn:   l => ({ wood: 40*(l+1), stone: 50*(l+1), iron: 30*(l+1) }),
    timeFn:   l => 30*(l+1),
    prodFn:   l => (l+1)*BASE_PROD,
    defFn:    _ => 0, maxLevel: 10, unlocked: _ => true,
  },
  quarry: {
    costFn:   l => ({ wood: 65*(l+1), stone: 40*(l+1), iron: 30*(l+1) }),
    timeFn:   l => 30*(l+1),
    prodFn:   l => (l+1)*BASE_PROD,
    defFn:    _ => 0, maxLevel: 10, unlocked: _ => true,
  },
  iron_mine: {
    costFn:   l => ({ wood: 75*(l+1), stone: 65*(l+1), iron: 40*(l+1) }),
    timeFn:   l => 35*(l+1),
    prodFn:   l => (l+1)*BASE_PROD,
    defFn:    _ => 0, maxLevel: 10, unlocked: _ => true,
  },
  barracks: {
    costFn:   l => ({ wood: 200*(l+1), stone: 170*(l+1), iron: 90*(l+1) }),
    timeFn:   l => 60*(l+1),
    prodFn:   _ => 0, defFn: _ => 0, maxLevel: 5,
    unlocked: _ => true,
  },
  stable: {
    costFn:   l => ({ wood: 270*(l+1), stone: 240*(l+1), iron: 160*(l+1) }),
    timeFn:   l => 80*(l+1),
    prodFn:   _ => 0, defFn: _ => 0, maxLevel: 5,
    unlocked: v => (v.buildings['barracks'] ?? 0) >= 1,
  },
  wall: {
    costFn:   l => ({ wood: 50*(l+1), stone: 100*(l+1), iron: 20*(l+1) }),
    timeFn:   l => 20*(l+1),
    prodFn:   _ => 0, defFn: l => 0.037*(l+1), maxLevel: 20,
    unlocked: _ => true,
  },
  rally_point: {
    costFn:   _ => ({ wood: 10, stone: 40, iron: 0 }),
    timeFn:   _ => 2, prodFn: _ => 0, defFn: _ => 0, maxLevel: 1,
    unlocked: _ => true,
  },
  farm: {
    costFn:   l => ({ wood: 45*(l+1), stone: 40*(l+1), iron: 30*(l+1) }),
    timeFn:   l => 25*(l+1),
    prodFn:   _ => 0, defFn: _ => 0, maxLevel: 30,
    unlocked: _ => true,
  },
  academy: {
    // Coût adapté à la simulation (maxStorage=10000/ressource → total max 30000)
    costFn:   _ => ({ wood: 3500, stone: 4000, iron: 3000 }),
    timeFn:   _ => 200,
    prodFn:   _ => 0, defFn: _ => 0, maxLevel: 1,
    unlocked: v => (v.buildings['barracks'] ?? 0) >= 1,
  },
};

function makeBuildingDef(id: string, v: VillageState): BotBuilding | null {
  const cfg = BUILDING_CFGS[id];
  if (!cfg) return null;
  const lvl = v.buildings[id] ?? 0;
  if (lvl >= cfg.maxLevel) return null;
  return {
    id, name: id,
    currentLevel: lvl, nextLevel: lvl + 1,
    cost: cfg.costFn(lvl),
    buildTimeSeconds: cfg.timeFn(lvl),
    productionGainPerHour: cfg.prodFn(lvl),
    defenseBonus: cfg.defFn(lvl),
    isUnlocked: cfg.unlocked(v),
    isInQueue: v.buildQueue.some(j => j.buildingId === id),
  };
}

// ── Bottleneck resource ────────────────────────────────────────

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

// ── Construction du snapshot ──────────────────────────────────

function buildSnapshot(v: VillageState, opp: VillageState, tick: number): GameSnapshot {
  const buildingIds = [
    'timber_camp','quarry','iron_mine','barracks','stable',
    'wall','rally_point','farm','academy',
  ];
  const availableBuildings: BotBuilding[] = [];
  for (const id of buildingIds) {
    const b = makeBuildingDef(id, v);
    if (b) availableBuildings.push(b);
  }

  // Unités disponibles
  const availableUnits: BotUnit[] = [];
  if ((v.buildings['barracks'] ?? 0) >= 1) {
    availableUnits.push({ ...UNIT_DEFS.spearman });
    availableUnits.push({ ...UNIT_DEFS.axeman });
  }
  if ((v.buildings['stable'] ?? 0) >= 1) {
    availableUnits.push({ ...UNIT_DEFS.scout });
  }
  if ((v.buildings['academy'] ?? 0) >= 1) {
    availableUnits.push({ ...UNIT_DEFS.noble });
  }

  // 26.3 — Utiliser la défense mémorisée si disponible (sinon fallback sur les troupes réelles)
  const oppDefObserved = v.defenseMemory.get(opp.id) ?? defPow(opp.troops);
  const oppPoints = Object.values(opp.buildings).reduce((s, l) => s + l * 50, 0);
  const oppRes    = (opp.wood + opp.stone + opp.iron) * 0.5;

  // ── Cibles ──────────────────────────────────────────────────
  const myOff = offPow(v.troops);

  // 24.2 — Plus de saveForConquest : toujours montrer les cibles.
  // scoreNobleTrain (score 8–10) prend la priorité automatiquement dès qu'un noble est prêt.
  const targets: BotTarget[] = [{
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
  }];

  // 24.1 — Désigner la cible dès la phase late
  if (v.phase === 'late' && !v.conquestTarget) {
    v.conquestTarget = opp.id;
    log(tick, v, 'CONQUEST_TARGET', `Cible sélectionnée : ${opp.id}`);
  }

  // 25.3 — Déverrouillage si ≥3 défaites consécutives sur la cible verrouillée
  if (v.conquestTarget) {
    const losses = v.consecutiveLossesByTarget.get(v.conquestTarget) ?? 0;
    if (losses >= 3) {
      // Dans le duel il n'y a qu'un adversaire, donc on garde la même cible mais on reset
      v.consecutiveLossesByTarget.set(v.conquestTarget, 0);
      log(tick, v, 'TARGET_RESET', `3 défaites vs ${v.conquestTarget} — compteur reset`);
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

  // Appliquer le gaspillage de ressources selon le niveau (comme BotBrain.applyResourceWaste)
  // Niveau 1 = voit 60 % de ses ressources réelles → décisions plus lentes / moins efficaces
  const waste = profile.resourceWasteRate;
  const visW = Math.min(v.wood,  v.maxStorage) * (1 - waste);
  const visS = Math.min(v.stone, v.maxStorage) * (1 - waste);
  const visI = Math.min(v.iron,  v.maxStorage) * (1 - waste);

  return {
    villageId:           v.id,
    wood:  visW,
    stone: visS,
    iron:  visI,
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
    defensivePower:      defPow(v.troops),
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
  attacker: VillageState,
  defender: VillageState,
  tick:     number,
): void {
  const atkPow = atk.power;
  const defPow_ = defPow(defender.troops);
  // 26.3 — Mémoriser la puissance défensive observée sur cette cible
  attacker.defenseMemory.set(defender.id, defPow_);
  const forceRatio = atkPow / Math.max(defPow_, 1);
  const winProb    = 1 - Math.exp(-forceRatio * 0.8);
  const won        = Math.random() < winProb;

  attacker.stats.attacksSent++;

  if (atk.hasNoble) {
    attacker.stats.nobleAttacks++;
    // Noble réduit la loyauté même si l'attaquant perd
    const loyalty_before = defender.loyalty;
    defender.loyalty = Math.max(0, defender.loyalty - NOBLE_LOYALTY_HIT);
    log(tick, attacker, 'NOBLE_ATTACK', `Loyauté ${defender.id}: ${loyalty_before} → ${defender.loyalty}`);
  }

  if (won) {
    attacker.stats.attacksWon++;
    // 27.2 — Cooldown victoire : 3 ticks
    attacker.attackCooldownTick.set(defender.id, tick + 3);
    // Pertes défenseur
    const defLossRate = Math.min(0.85, forceRatio * 0.4);
    for (const [u, n] of Object.entries(defender.troops)) {
      const lost = Math.floor(n * defLossRate);
      defender.troops[u] = n - lost;
      defender.stats.troopsLost += lost;
    }
    // Loot
    const carryTotal = Object.entries(atk.units)
      .reduce((s, [u, n]) => s + n * ((UNIT_DEFS[u]?.carryCapacity ?? 10)), 0);
    const loot = Math.min(
      Math.floor((defender.wood + defender.stone + defender.iron) * 0.33),
      carryTotal,
    );
    const each = Math.floor(loot / 3);
    defender.wood  = Math.max(0, defender.wood  - each);
    defender.stone = Math.max(0, defender.stone - each);
    defender.iron  = Math.max(0, defender.iron  - each);
    attacker.wood  = Math.min(attacker.maxStorage, attacker.wood  + each);
    attacker.stone = Math.min(attacker.maxStorage, attacker.stone + each);
    attacker.iron  = Math.min(attacker.maxStorage, attacker.iron  + each);
    attacker.stats.resourcesLooted += each * 3;
    defender.stats.resourcesLost   += each * 3;
    // Pertes attaquant (victoire ~15%) — les survivants RENTRENT au village
    let atkLost = 0;
    for (const [u, n] of Object.entries(atk.units)) {
      const lost      = Math.floor(n * 0.15);
      const survivors = n - lost;
      attacker.troops[u] = (attacker.troops[u] ?? 0) + survivors;
      attacker.stats.troopsLost += lost;
      atkLost += lost;
    }
    attacker.troopsLostLastCombat = atkLost;
    // 25.3 — Victoire : réinitialiser le compteur de défaites sur cette cible
    attacker.consecutiveLossesByTarget.set(defender.id, 0);
    log(tick, attacker, 'COMBAT_WIN', `pow=${atkPow} vs def=${defPow_} loot=${each*3}`);
  } else {
    attacker.stats.attacksLost++;
    // 27.2 — Cooldown défaite : 15 ticks
    attacker.attackCooldownTick.set(defender.id, tick + 15);
    // 25.3 — Défaite : incrémenter le compteur de défaites consécutives
    const prevLosses = attacker.consecutiveLossesByTarget.get(defender.id) ?? 0;
    attacker.consecutiveLossesByTarget.set(defender.id, prevLosses + 1);
    // Défaite : 30% des troupes survivent et rentrent
    let atkLost = 0;
    for (const [u, n] of Object.entries(atk.units)) {
      const lost      = Math.floor(n * 0.70);
      const survivors = n - lost;
      attacker.troops[u] = (attacker.troops[u] ?? 0) + survivors;
      attacker.stats.troopsLost += lost;
      atkLost += lost;
    }
    attacker.troopsLostLastCombat = atkLost;
    log(tick, attacker, 'COMBAT_LOSS', `pow=${atkPow} vs def=${defPow_}`);
  }

  // ── Conquête ────────────────────────────────────────────────
  if (defender.loyalty <= 0) {
    attacker.stats.conquests++;
    log(tick, attacker, '🏆 CONQUEST', `${defender.id} conquis ! (loyauté tombée à 0)`);
    // Reset : le village est recréé avec loyauté 100 mais ressources vidées
    defender.loyalty = 100;
    defender.wood  = 0;
    defender.stone = 0;
    defender.iron  = 0;
    // Retirer le noble utilisé
    if (atk.hasNoble) {
      attacker.troops['noble'] = Math.max(0, (attacker.troops['noble'] ?? 1) - 1);
    }
  }
}

// ── Production ───────────────────────────────────────────────

// Multiplicateur de production normalisé sur le niveau 6 (niveau 6 = 1.0).
// Niveau 1 ≈ 0.825, niveau 10 ≈ 1.14 — crée un avantage économique réel
// sans modifier les duels entre bots de même niveau.
function levelProdMultiplier(level: number): number {
  const l = Math.max(1, Math.min(10, level));
  return 1.0 + (l - 6) * 0.035;
}

function produce(v: VillageState): void {
  const pm = levelProdMultiplier(v.level);
  v.wood  = Math.min(v.maxStorage, v.wood  + (v.buildings['timber_camp']??0) * BASE_PROD * pm);
  v.stone = Math.min(v.maxStorage, v.stone + (v.buildings['quarry']     ??0) * BASE_PROD * pm);
  v.iron  = Math.min(v.maxStorage, v.iron  + (v.buildings['iron_mine']  ??0) * BASE_PROD * pm);
  // maxStorage croît avec le niveau de la ferme
  v.maxStorage = Math.max(4000, (v.buildings['farm'] ?? 1) * 2500);
}

// ── Files ─────────────────────────────────────────────────────

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

// ── Application d'une action ──────────────────────────────────

function applyAction(
  action:  ScoredAction,
  v:       VillageState,
  opp:     VillageState,
  pending: PendingAttack[],
  tick:    number,
): void {
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
      for (const [u, n] of Object.entries(units)) {
        v.troops[u] = Math.max(0, (v.troops[u] ?? 0) - n);
      }
      const pow      = offPow(units);
      const hasNoble = (units['noble'] ?? 0) > 0;
      pending.push({ fromId: v.id, units, arrivesAt: tick + TRAVEL_TICKS, power: pow, hasNoble });
      v.lastAttackTick.set(opp.id, tick);
      const label = hasNoble ? '⚔️  NOBLE_SEND' : 'ATTACK';
      log(tick, v, label, `→ ${opp.id} ${JSON.stringify(units)} pow=${pow} s=${action.score.toFixed(3)}`);
      break;
    }

    case 'scout': {
      v.scoutMemory.set(opp.id, Date.now());
      log(tick, v, 'SCOUT', `→ ${opp.id}`);
      break;
    }

    case 'noble_train': {
      // 24.1 — Noble train : cleaner + nobles en rafale décalée
      const cleanerUnits = action.cleanerUnits ?? {};
      const noblesCount  = action.units?.['noble'] ?? 0;
      if (noblesCount < 1) break;

      // Déduire les troupes du village
      for (const [u, n] of Object.entries(cleanerUnits)) {
        v.troops[u] = Math.max(0, (v.troops[u] ?? 0) - n);
      }
      v.troops['noble'] = Math.max(0, (v.troops['noble'] ?? 0) - noblesCount);

      // Cleaner : arrive en premier (TRAVEL_TICKS)
      const cleanerPow = offPow(cleanerUnits);
      pending.push({
        fromId: v.id, units: cleanerUnits,
        arrivesAt: tick + TRAVEL_TICKS, power: cleanerPow, hasNoble: false,
      });

      // Nobles : arrivées décalées de 1 tick chacune, après le cleaner
      for (let i = 0; i < noblesCount; i++) {
        pending.push({
          fromId: v.id, units: { noble: 1 },
          arrivesAt: tick + TRAVEL_TICKS + 1 + i, power: 0, hasNoble: true,
        });
      }

      v.lastAttackTick.set(opp.id, tick);
      log(tick, v, '🎯 NOBLE_TRAIN', `→ ${opp.id} cleaner=${cleanerPow} nobles=${noblesCount}`);
      break;
    }

    case 'idle':
      break;
  }

  // Auto-désigner la cible de conquête dès que l'académie est construite
  if (!v.conquestTarget && (v.buildings['academy'] ?? 0) >= 1) {
    v.conquestTarget = opp.id;
    log(tick, v, 'CONQUEST_TARGET', `auto → ${opp.id}`);
  }
}

// ── Bruit ─────────────────────────────────────────────────────

function noisy(score: number): number {
  return score * (1 - NOISE_EPSILON + Math.random() * 2 * NOISE_EPSILON);
}

// ── Initialisation ────────────────────────────────────────────

function initVillage(id: string, name: string, level: number, style: BotStyle): VillageState {
  // Le rusher démarre avec plus de fer (forge les armes)
  // Le builder démarre avec plus de bois (chantiers)
  const bonusWood  = style === 'builder' ? 400 : 0;
  const bonusIron  = style === 'rusher'  ? 300 : 0;

  return {
    id, name, level, style,
    phase: 'early',
    wood:  500 + bonusWood,
    stone: 500,
    iron:  300 + bonusIron,
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
  };
}

// ── Simulation ────────────────────────────────────────────────

export function simulate(
  styleA: BotStyle, levelA: number,
  styleB: BotStyle, levelB: number,
  silent = false,
) {
  const A = initVillage('Alpha', 'Alpha', levelA, styleA);
  const B = initVillage('Beta',  'Beta',  levelB, styleB);

  const weightsA = buildStyleWeights(styleA);
  const weightsB = buildStyleWeights(styleB);

  const pending: PendingAttack[] = [];

  let conquestAt: number | null = null;
  let conqueror:  string | null = null;

  if (!silent) {
    console.log(`\n${'═'.repeat(64)}`);
    console.log(`  DUEL JUSQU'À L'ENDGAME`);
    console.log(`  Alpha (nv${levelA}, ${styleA})  vs  Beta (nv${levelB}, ${styleB})`);
    console.log(`  ${TOTAL_TICKS} ticks × ${TICK_MINUTES} min = ${TOTAL_TICKS*TICK_MINUTES} min simulées`);
    console.log(`${'═'.repeat(64)}\n`);
  }

  for (let tick = 1; tick <= TOTAL_TICKS; tick++) {

    // 1. Production + historique ressources
    produce(A);
    produce(B);
    A.resourceHistory.push({ wood:A.wood, stone:A.stone, iron:A.iron });
    B.resourceHistory.push({ wood:B.wood, stone:B.stone, iron:B.iron });
    if (A.resourceHistory.length > 10) A.resourceHistory.shift();
    if (B.resourceHistory.length > 10) B.resourceHistory.shift();

    // 2. Compléter les files
    completeBuildJobs(A, tick);
    completeBuildJobs(B, tick);
    completeRecruitJobs(A, tick);
    completeRecruitJobs(B, tick);

    // 3. Résoudre les attaques arrivant ce tick
    for (const atk of pending.filter(p => p.arrivesAt === tick)) {
      const attacker = atk.fromId === A.id ? A : B;
      const defender = atk.fromId === A.id ? B : A;
      resolveAttack(atk, attacker, defender, tick);
      if (attacker.stats.conquests > 0 && conquestAt === null) {
        conquestAt = tick;
        conqueror  = attacker.id;
      }
    }
    pending.splice(0, pending.length, ...pending.filter(p => p.arrivesAt > tick));

    // 4. Décisions des bots
    const order = Math.random() < 0.5 ? [A, B] : [B, A];
    for (const v of order) {
      const opp      = v === A ? B : A;
      const weights  = v === A ? weightsA : weightsB;
      const snap     = buildSnapshot(v, opp, tick);
      // Bruit spécifique au niveau (niveau 1 → ε=0.55, niveau 10 → ε=0.01)
      const epsilon  = buildProfile(v.level).scoreNoiseEpsilon;

      v.phase = evaluatePhase(v.phase, snap);

      const candidates = computeAllScores(snap, v.phase, weights)
        .map(a => ({ ...a, score: a.score * (1 - epsilon + Math.random() * 2 * epsilon) }));
      const best = candidates.reduce((a, b) => a.score > b.score ? a : b);
      applyAction(best, v, opp, pending, tick);
    }

    // Affichage de progression tous les 50 ticks
    if (!silent && tick % 50 === 0) {
      const pA = `off=${offPow(A.troops)} def=${defPow(A.troops)} axe=${A.troops['axeman']??0} loy=${B.loyalty}`;
      const pB = `off=${offPow(B.troops)} def=${defPow(B.troops)} axe=${B.troops['axeman']??0} loy=${A.loyalty}`;
      console.log(`[t${tick}] Alpha(${A.phase}): ${pA}`);
      console.log(`[t${tick}] Beta (${B.phase}): ${pB}`);
      console.log('');
    }
  }

  const metricsA = extractMetrics(A.id);
  const metricsB = extractMetrics(B.id);
  return { A, B, conquestAt, conqueror, metricsA, metricsB };
}

// ── Rapport ───────────────────────────────────────────────────

function report(A: VillageState, B: VillageState, conquestAt: number | null, conqueror: string | null) {

  // ── Journal filtré ───────────────────────────────────────────
  console.log('── Journal des actions clés ─────────────────────────────\n');

  const IMPORTANT = new Set([
    'BUILD','RECRUIT','BUILD_DONE','RECRUIT_DONE',
    'ATTACK','⚔️  NOBLE_SEND','NOBLE_ATTACK','🎯 NOBLE_TRAIN',
    'COMBAT_WIN','COMBAT_LOSS','CONQUEST_TARGET','🏆 CONQUEST',
  ]);

  for (const e of LOG.filter(e => IMPORTANT.has(e.action))) {
    const who    = e.villageId === A.id ? `Alpha[${A.style}]` : `Beta[${B.style}]`;
    const phase  = e.phase.padEnd(5);
    const action = e.action.padEnd(14);
    const line   = `  t${String(e.tick).padStart(3)} [${phase}] ${who.padEnd(18)} ${action} ${e.detail}`;
    // Mettre en évidence les événements clés
    if (e.action.includes('CONQUEST') || e.action.includes('NOBLE')) {
      console.log(`\x1b[33m${line}\x1b[0m`); // jaune
    } else {
      console.log(line);
    }
  }

  // ── Statistiques finales ─────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  RÉSULTAT FINAL`);
  console.log(`${'═'.repeat(64)}\n`);

  if (conquestAt) {
    console.log(`\x1b[32m  🏆 CONQUÊTE au tick ${conquestAt} par ${conqueror} !\x1b[0m\n`);
  } else {
    console.log(`  ⏱  Pas de conquête dans les ${TOTAL_TICKS} ticks.\n`);
  }

  for (const v of [A, B]) {
    const name    = v.id;
    const winRate = v.stats.attacksSent > 0
      ? (v.stats.attacksWon / v.stats.attacksSent * 100).toFixed(0) : '—';
    const minesAvg = (['timber_camp','quarry','iron_mine'] as const)
      .reduce((s,id) => s+(v.buildings[id]??0),0) / 3;

    console.log(`  ${name} (nv${v.level}, ${v.style})`);
    console.log(`    Phase          : ${v.phase}`);
    console.log(`    Ressources     : bois=${v.wood} pierre=${v.stone} fer=${v.iron} (cap=${v.maxStorage})`);
    console.log(`    Troupes        : ${JSON.stringify(v.troops)}`);
    console.log(`    Bâtiments clés : barracks=${v.buildings['barracks']??0} academy=${v.buildings['academy']??0} wall=${v.buildings['wall']??0} mines≈lv${minesAvg.toFixed(1)}`);
    console.log(`    Loyauté        : ${v.loyalty}/100`);
    console.log(`    Attaques       : ${v.stats.attacksSent} env | ${v.stats.attacksWon} won | ${v.stats.attacksLost} lost | win=${winRate}%`);
    console.log(`    Noble attacks  : ${v.stats.nobleAttacks}`);
    console.log(`    Pillages nets  : +${v.stats.resourcesLooted} / -${v.stats.resourcesLost}`);
    console.log(`    Troupes perdues: ${v.stats.troopsLost}`);
    console.log('');
  }

  // ── Analyse ──────────────────────────────────────────────────
  console.log(`${'═'.repeat(64)}`);
  console.log(`  ANALYSE & AMÉLIORATIONS PROPOSÉES`);
  console.log(`${'═'.repeat(64)}\n`);

  for (const v of [A, B]) {
    const name   = v.id;
    const myLogs = LOG.filter(e => e.villageId === v.id);

    const firstRallyTick   = myLogs.find(e => e.action==='BUILD' && e.detail.includes('rally_point'))?.tick ?? null;
    const firstBarracksTick= myLogs.find(e => e.action==='BUILD_DONE' && e.detail.includes('barracks'))?.tick ?? null;
    const firstAcademyTick = myLogs.find(e => e.action==='BUILD_DONE' && e.detail.includes('academy'))?.tick ?? null;
    const firstNobleTick   = myLogs.find(e => e.action==='RECRUIT_DONE' && e.detail.includes('noble'))?.tick ?? null;
    const firstAttackTick  = myLogs.find(e => e.action==='ATTACK')?.tick ?? null;
    const firstNobleSend   = myLogs.find(e => e.action==='⚔️  NOBLE_SEND')?.tick ?? null;

    const hasStable  = (v.buildings['stable']  ??0) >= 1;
    const hasAcademy = (v.buildings['academy'] ??0) >= 1;
    const minesAvg   = (['timber_camp','quarry','iron_mine'] as const)
      .reduce((s,id)=>s+(v.buildings[id]??0),0) / 3;

    const winRate = v.stats.attacksSent > 0
      ? v.stats.attacksWon / v.stats.attacksSent : null;

    console.log(`  ── ${name} (nv${v.level}, ${v.style}) ──────────────────`);

    const obs: string[] = [];
    const sug: string[] = [];

    // Rally point
    if (!firstRallyTick) {
      obs.push('❌ Rally point jamais construit');
      sug.push('Score fixe rally_point = 12 en early (priorité absolue)');
    } else if (firstRallyTick > 6) {
      obs.push(`⚠️  Rally point tardif (t${firstRallyTick})`);
    } else {
      obs.push(`✅ Rally point rapide (t${firstRallyTick})`);
    }

    // Caserne
    if (!firstBarracksTick) {
      obs.push('❌ Aucune caserne construite — aucun recrutement possible');
      sug.push('Scorer caserne plus haut quand minesLevel >= 2');
    } else if (firstBarracksTick > 30) {
      obs.push(`⚠️  Caserne tardive (t${firstBarracksTick}) — retarde tout le recrutement`);
      sug.push('Boost caserne en mid si minesLevel >= 2 : score × 1.8');
    } else {
      obs.push(`✅ Caserne construite à t${firstBarracksTick}`);
    }

    // Écurie
    if (!hasStable) {
      obs.push('⚠️  Écurie jamais construite — scouts inexistants');
      sug.push('Score fixe stable = 3.5 en mid si barracks >= 1 et stable = 0');
    }

    // Académie
    if (!hasAcademy) {
      obs.push('❌ Académie jamais construite — conquête impossible');
      sug.push('Boost academy en late quand offensivePower >= 1500 (seuil moins strict que 2000)');
    } else {
      obs.push(`✅ Académie construite à t${firstAcademyTick}`);
    }

    // Noble
    if (!firstNobleTick) {
      obs.push('❌ Noble jamais recruté');
    } else {
      obs.push(`✅ Premier noble à t${firstNobleTick}`);
    }

    // Première attaque noble
    if (firstNobleSend) {
      obs.push(`✅ Première attaque noble à t${firstNobleSend}`);
    } else if (hasAcademy && firstNobleTick) {
      obs.push('⚠️  Noble recruté mais jamais envoyé en conquête');
      sug.push('Vérifier que conquestTargetId est bien injecté quand noble disponible');
    }

    // Taux de victoire
    if (winRate !== null && winRate < 0.45) {
      obs.push(`❌ Taux de victoire faible (${(winRate*100).toFixed(0)}%) — attaque trop tôt`);
      sug.push('Augmenter le seuil de troupes min avant d\'attaquer (proportionnel à attackCapacity)');
    } else if (winRate !== null && winRate >= 0.60) {
      obs.push(`✅ Bon taux de victoire (${(winRate*100).toFixed(0)}%)`);
    }

    // Mines
    if (minesAvg < 3) {
      obs.push(`⚠️  Mines sous-développées (moy lv${minesAvg.toFixed(1)})`);
      sug.push('Augmenter W_prod en early pour inciter à monter les mines plus vite');
    } else {
      obs.push(`✅ Mines correctement développées (moy lv${minesAvg.toFixed(1)})`);
    }

    // Boucle infernale
    const attackCount  = myLogs.filter(e=>e.action==='ATTACK').length;
    const recruitCount = myLogs.filter(e=>e.action==='RECRUIT').length;
    if (attackCount > 5 && !hasAcademy) {
      obs.push(`⚠️  ${attackCount} attaques sans jamais atteindre l'académie (boucle recrutement-attaque)`);
      sug.push('En late sans academy: bloquer les attaques si offensivePower < CONQUEST_POWER_THRESHOLD');
    }

    const maxAxe = Math.max(0, ...myLogs
      .filter(e=>e.action==='RECRUIT_DONE' && e.detail.includes('axeman'))
      .map(e => parseInt(e.detail.match(/total (\d+)/)?.[1] ?? '0')));
    if (maxAxe > 0 && maxAxe < 20) {
      obs.push(`⚠️  Armée maximale de ${maxAxe} axemen — insuffisant pour l'academy (besoin ~40)`);
      sug.push('Incrémenter recruitCount batch en mid: passer à batch=5 dès que iron > 1000');
    }

    console.log(`  Builds: ${myLogs.filter(e=>e.action==='BUILD').length} | Recrues: ${recruitCount} | Attaques: ${attackCount} | Nobles envoyés: ${v.stats.nobleAttacks}`);
    console.log('  Observations :');
    for (const o of obs) console.log(`    ${o}`);
    if (sug.length > 0) {
      console.log('  Suggestions :');
      for (const s of sug) console.log(`    → ${s}`);
    }
    console.log('');
  }

  // ── Conclusion ───────────────────────────────────────────────
  console.log(`  ── Verdict ─────────────────────────────────────────────`);
  const totalA = A.wood+A.stone+A.iron + offPow(A.troops)*10 + A.stats.conquests*5000;
  const totalB = B.wood+B.stone+B.iron + offPow(B.troops)*10 + B.stats.conquests*5000;
  console.log(`  Alpha score : ${totalA}`);
  console.log(`  Beta  score : ${totalB}`);
  if (conquestAt) {
    console.log(`\n  🏆 Vainqueur décisif : ${conqueror} (conquête au tick ${conquestAt})`);
  } else {
    const winner = totalA > totalB ? A : B;
    console.log(`\n  📊 Avantage points : ${winner.id} (${winner.style}) — mais pas de conquête`);
    console.log(`  → La partie serait plus intéressante si l'academy était accessible.`);
  }
  console.log('');
}

// ── Lancer 2 duels avec des styles différents ─────────────────

if (require.main === module) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Duel 1 : Rusher (nv7) vs Builder (nv4)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const d1 = simulate('rusher', 7, 'builder', 4);
  report(d1.A, d1.B, d1.conquestAt, d1.conqueror);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Duel 2 : Balanced (nv6) vs Balanced (nv6)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const d2 = simulate('balanced', 6, 'balanced', 6);
  report(d2.A, d2.B, d2.conquestAt, d2.conqueror);
}
