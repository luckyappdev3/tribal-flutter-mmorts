// ─────────────────────────────────────────────────────────────
// bot.scores.ts — Score Engine (Utility AI)
// Calcule un score d'utilité pour chaque action candidate.
// Le BotBrain exécute l'action avec le score le plus élevé.
// ─────────────────────────────────────────────────────────────

import {
  Phase,
  GameSnapshot,
  BotBuilding,
  BotUnit,
  BotTarget,
  BotOutgoingAttack,
  ScoredAction,
  PhaseWeights,
  AlliedVillageInfo,
} from './bot.types';
import { buildStyleWeights, PHASE_WEIGHTS } from './bot.profile';

// Bâtiments "décoratifs" : utiles mais pas stratégiques
// → bloqués en mid/late si l'armée est insuffisante
const LOW_PRIORITY_BUILDINGS = new Set(['farm', 'hiding_spot', 'statue']);

// Quelle ressource chaque mine produit (pour 13.1 et 13.2)
const MINE_RESOURCE: Record<string, 'wood' | 'stone' | 'iron'> = {
  timber_camp: 'wood',
  quarry:      'stone',
  iron_mine:   'iron',
};

// Seuil minimum de troupes offensives à la maison avant d'attaquer
const MIN_OFFENSIVE_TROOPS_TO_ATTACK = 10;

// ── Utilitaires ──────────────────────────────────────────────

/** Normalise une valeur brute entre 0 et 1 */
function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Vérifie si le bot peut payer le coût */
function canAfford(
  cost: { wood: number; stone: number; iron: number },
  snap: GameSnapshot,
): boolean {
  return snap.wood >= cost.wood && snap.stone >= cost.stone && snap.iron >= cost.iron;
}

/** Nombre total de troupes offensives à la maison */
function offensiveTroopsHome(snap: GameSnapshot): number {
  let total = 0;
  for (const [unitType, count] of Object.entries(snap.troopsHome)) {
    if (UNIT_ROLE_MAP[unitType] === 'offensive') total += count;
  }
  return total;
}

// ── Score : construire un bâtiment ───────────────────────────

function scoreBuild(b: BotBuilding, snap: GameSnapshot, phase: Phase, W: PhaseWeights): number {

  // Guards
  if (!b.isUnlocked)               return -Infinity;
  if (b.isInQueue)                 return -Infinity;
  if (!canAfford(b.cost, snap))    return -Infinity;

  // Phase 17.1 — Garde minimum de ressources (floor = 15 % du stockage max)
  // Actif uniquement en mid/late : en early les ressources sont naturellement basses
  // et le bot doit développer librement.
  // Ne pas construire si cela viderait en dessous du floor, sauf :
  //   - rally_point (toujours autorisé, coût négligeable)
  //   - académie (déjà sécurisée par les checks offensivePower + buffer 1.2×)
  //   - mur sous attaque entrante (urgence défensive)
  if (phase !== 'early') {
    const resourceFloor = snap.maxStorage * 0.15;
    const belowFloor =
      (snap.wood  - b.cost.wood  < resourceFloor) ||
      (snap.stone - b.cost.stone < resourceFloor) ||
      (snap.iron  - b.cost.iron  < resourceFloor);
    const isEmergencyBuild =
      b.id === 'rally_point' ||
      b.id === 'academy' ||
      (b.id === 'wall' && snap.incomingAttacks.length > 0);
    if (belowFloor && !isEmergencyBuild) return -Infinity;
  }

  // Rally point : priorité absolue en early si pas encore construit
  if (b.id === 'rally_point' && !snap.rallyPointBuilt) {
    return 10.0;
  }

  // Urgence ferme : si pop saturée, construire la ferme avant tout le reste
  // → placé avant buildQueueCount pour qu'elle soit scorée même si file presque pleine
  if (b.id === 'farm' && snap.populationAvailable <= 0) {
    if (snap.buildQueueCount >= 2) return -Infinity; // file pleine, impossible
    return 9.0;
  }

  // Bloquer les autres builds si pop critique (garder un slot pour la ferme)
  if (snap.populationAvailable <= 0 && snap.buildQueueCount >= 1) {
    return -Infinity;
  }

  if (snap.buildQueueCount >= 2)   return -Infinity;

  // Forge (smith) : priorité en mid/late si aucune troupe offensive disponible
  if (b.id === 'smith' && phase !== 'early' && snap.offensivePower === 0) {
    return 8.0;
  }

  // Noble : uniquement en late, avec conditions de ressources et de force (14.1)
  if (b.id === 'academy' && phase !== 'late') return -Infinity;
  if (b.id === 'academy' && phase === 'late') {
    if (snap.buildQueueCount >= 2) return -Infinity;
    // Seuil relatif au coût réel du bâtiment (fonctionne en jeu réel ET en simulation)
    const academyCost = b.cost.wood + b.cost.stone + b.cost.iron;
    // 24.1 — Seuil abaissé à 400 (10 axemen) : le noble train n'exige pas une armée massive
    if (snap.offensivePower < 400) return -Infinity;
    if (!canAfford(b.cost, snap)) return -Infinity;
    if (snap.wood + snap.stone + snap.iron < academyCost * 1.2) return -Infinity;
    return 9.0; // priorité absolue quand les conditions sont remplies
  }

  // Écurie : score fixe en mid/late si pas encore construite — débloque les scouts (15.x)
  if (b.id === 'stable' && b.currentLevel === 0 && phase !== 'early') {
    if (snap.buildQueueCount >= 2) return -Infinity;
    if (!canAfford(b.cost, snap)) return -Infinity;
    return 3.0;
  }

  // Bâtiments décoratifs (farm, hiding_spot) : bloqués en mid/late
  // tant que l'armée offensive est insuffisante
  if (LOW_PRIORITY_BUILDINGS.has(b.id) && phase !== 'early') {
    if (offensiveTroopsHome(snap) < MIN_OFFENSIVE_TROOPS_TO_ATTACK) return -Infinity;
  }

  const totalCost = b.cost.wood + b.cost.stone + b.cost.iron;
  const totalRes  = snap.wood + snap.stone + snap.iron;

  const resRatio    = normalize(totalRes / Math.max(totalCost, 1), 0.5, 4.0);
  const prodGain    = normalize(b.productionGainPerHour, 0, 60);
  const defBonus    = normalize(b.defenseBonus, 0, 0.5);
  const costPenalty = normalize(totalCost, 100, 15000);
  const timePenalty = normalize(b.buildTimeSeconds, 1, 300);

  // Malus si l'autre slot est déjà utilisé
  const queuePenalty = snap.buildQueueCount * 0.10;

  let score = (
    W.W_res  * resRatio
  + W.W_prod * prodGain
  + W.W_def  * defBonus
  - W.W_cost * costPenalty
  - W.W_time * timePenalty
  - queuePenalty
  );

  // 12.3 — Mode siège : construire le mur en priorité absolue si 3+ attaques entrantes
  if (b.id === 'wall' && snap.incomingAttacks.length >= 3) {
    if (snap.buildQueueCount >= 2) return -Infinity;
    return 8.5;
  }

  // Boost casernes en mid : monter lv1→2→3 accélère le recrutement d'axemen (-6%/niveau)
  if (b.id === 'barracks' && phase === 'mid' && b.currentLevel < 3) {
    score *= 1 + (3 - b.currentLevel) * 0.4; // lv1→×1.8 | lv2→×1.4
  }

  // Boost écurie en mid : débloque les éclaireurs pour le renseignement
  if (b.id === 'stable' && phase === 'mid' && b.currentLevel < 2) {
    score *= 1.5;
  }

  // ── 13.1 — Bottleneck ressource ───────────────────────────
  // Booster la mine dont la ressource est chroniquement déficitaire
  if (snap.bottleneckResource && MINE_RESOURCE[b.id] === snap.bottleneckResource) {
    score *= 1.5;
  }
  // Pénaliser la mine d'une ressource déjà saturée (inutile de produire plus)
  const mineRes = MINE_RESOURCE[b.id];
  if (mineRes) {
    const resLevel = snap[mineRes] / Math.max(snap.maxStorage, 1);
    if (resLevel > 0.90) score *= 0.3; // entrepôt quasi-plein pour cette ressource
  }

  // ── 13.2 — Overflow entrepôt ──────────────────────────────
  // Si une ressource déborde, urgence de construire pour la dépenser
  const woodRatio  = snap.wood  / Math.max(snap.maxStorage, 1);
  const stoneRatio = snap.stone / Math.max(snap.maxStorage, 1);
  const ironRatio  = snap.iron  / Math.max(snap.maxStorage, 1);
  const maxRatio   = Math.max(woodRatio, stoneRatio, ironRatio);

  if (maxRatio > 0.85) {
    // Vérifier que ce bâtiment DÉPENSE la ressource qui déborde
    const costWood  = b.cost.wood  > 0 && woodRatio  > 0.85;
    const costStone = b.cost.stone > 0 && stoneRatio > 0.85;
    const costIron  = b.cost.iron  > 0 && ironRatio  > 0.85;
    if (costWood || costStone || costIron) {
      const urgency = normalize(maxRatio - 0.85, 0, 0.15); // 0→1 entre 85% et 100%
      score += urgency * 0.6; // jusqu'à +0.6 de bonus
    }
  }

  // ── 13.3 — Ratio coût/temps : pénaliser les longs builds quand urgent ─
  // Si stockage presque plein, privilégier les builds rapides (dépenser maintenant)
  if (maxRatio > 0.85 && b.buildTimeSeconds > 600) {
    score *= 0.5;
  }

  return score;
}

// ── Score : recruter une unité ────────────────────────────────

function scoreRecruit(u: BotUnit, snap: GameSnapshot, phase: Phase, W: PhaseWeights): number {

  // Guards
  if (!u.isUnlocked)                               return 0;
  if (!canAfford(u.cost, snap))                    return 0;
  if (snap.recruitQueues[u.buildingType] === true) return 0;

  // Interdit en early : pas de recrutement offensif
  if (phase === 'early' && (u.type === 'offensive' || u.type === 'siege')) return 0;

  // 12.1 — Sous attaque : bloquer l'offensif, prioriser le défensif
  const underAttack = snap.incomingAttacks.length > 0;
  if (underAttack && (u.type === 'offensive' || u.type === 'siege')) return 0;

  // Phase 17.2 — Recrutement défensif d'urgence
  // Si la loyauté est basse ET la défense est quasi nulle → spearmen en priorité absolue,
  // indépendamment de la phase. Le bot doit se rétablir avant de relancer l'offensive.
  const loyaltyUnderThreat = snap.loyaltyPoints < 50 && snap.defensivePower < 200;
  if (loyaltyUnderThreat && u.type === 'defensive') {
    return 5.0; // score fixe élevé — passe avant tout recrutement offensif
  }
  // En mode urgence : bloquer les offensifs tant que la défense est insuffisante
  if (loyaltyUnderThreat && u.type === 'offensive') return 0;

  // Noble : uniquement en late, score fixe prioritaire si cible de conquête définie (14.2)
  if (u.type === 'conquest' && phase !== 'late') return 0;
  if (u.type === 'conquest' && phase === 'late') {
    if (!snap.conquestTargetId) return 0; // pas de cible = inutile de recruter
    const noblesHome    = snap.troopsHome['noble']     ?? 0;
    const noblesTransit = snap.troopsInTransit['noble'] ?? 0;
    // 24.3 — Noble train : recruter jusqu'à 5 nobles pour couvrir 100 points de loyauté
    // (22 pts/noble × 5 = 110 pts → conquête assurée en une passe)
    if (noblesHome + noblesTransit >= 5) return 0;
    // Plus on approche de 5, moins c'est urgent (décroissance progressive)
    const urgency = 1.0 - (noblesHome + noblesTransit) * 0.15; // 1.0 → 0.25
    return 3.5 * urgency;
  }

  // Paladin : utile dès mid
  if (u.id === 'paladin' && phase === 'early') return 0;

  // Éclaireurs : priorité fixe en mid si on n'en a pas encore (renseignement crucial)
  if (u.id === 'scout' && phase !== 'early' && (snap.troopsHome['scout'] ?? 0) < 3) {
    return 0.5;
  }

  // En mid/late : bloquer les défenseurs tant qu'on n'a pas une armée offensive minimale
  // → force le bot à accumuler des axemen avant de recruter des lanciers/épéistes
  if (phase !== 'early' && u.type === 'defensive') {
    if (offensiveTroopsHome(snap) < MIN_OFFENSIVE_TROOPS_TO_ATTACK) return 0;
  }

  const totalCost = u.cost.wood + u.cost.stone + u.cost.iron;

  // Multiplicateur de menace si attaque entrante
  const threatMod = snap.incomingAttacks.length > 0 ? W.W_threat : 1.0;

  // Bonus d'urgence : si le bot n'a aucune troupe offensive en mid/late,
  // priorité absolue au recrutement offensif
  const noOffense  = snap.offensivePower === 0 && phase !== 'early';
  const urgencyMod = noOffense && u.type === 'offensive' ? 3.0 : 1.0;

  // 27.3 — Reconstruction après grosse défaite : priorité aux offensifs (×2.0)
  const rebuildMod = snap.recentHeavyLoss && u.type === 'offensive' && phase !== 'early' ? 2.0 : 1.0;

  // Bonus d'accumulation : favoriser les offensifs quand on approche du seuil d'attaque
  // (encourage à grossir l'armée avant d'envoyer)
  const troopsHome    = offensiveTroopsHome(snap);
  const armyRampMod   = (u.type === 'offensive' && phase !== 'early' && troopsHome < MIN_OFFENSIVE_TROOPS_TO_ATTACK)
    ? 1.5
    : 1.0;

  const atkPower    = normalize(u.attack, 0, 200);
  const defValue    = normalize(u.defenseGeneral, 0, 300);
  const costPenalty = normalize(totalCost, 50, 3000);
  const speedBonus  = normalize(1 / Math.max(u.speedSecondsPerTile, 0.1), 0, 2);

  // En late, favoriser les unités rapides pour les raids finaux
  const lateSpeed = phase === 'late' ? speedBonus * 0.25 : 0;

  // 19.1 — Diversification en late : boost cavalerie légère si sous-représentée (< 30 % de l'offensif)
  // Cible : mix 70 % axemen + 30 % cavalerie pour meilleur rapport vitesse/force
  let cavBoost = 1.0;
  if (u.id === 'light_cavalry' && phase === 'late') {
    let totalOff = 0;
    for (const [type, count] of Object.entries(snap.troopsHome)) {
      if (['axeman', 'light_cavalry', 'mounted_archer'].includes(type)) totalOff += count;
    }
    const cavRatio = totalOff > 0 ? (snap.troopsHome['light_cavalry'] ?? 0) / totalOff : 0;
    if (cavRatio < 0.30) cavBoost = 1.5;
  }

  return (
    (W.W_atk * atkPower + W.W_def_unit * defValue) * threatMod * urgencyMod * armyRampMod * rebuildMod
  - W.W_cost * costPenalty
  + lateSpeed
  ) * cavBoost;
}

// ── Score : lancer une attaque ────────────────────────────────

function scoreAttack(t: BotTarget, snap: GameSnapshot, phase: Phase, W: PhaseWeights): number {
  // Guard : pas de rally point → impossible d'attaquer
  if (!snap.rallyPointBuilt) return -1;

  // 12.3 — Mode siège : stopper toute attaque sortante si 3+ vagues entrantes
  if (snap.incomingAttacks.length >= 3) return -1;

  // Guard : trajet aller-retour impossible
  const travelMinutes = t.travelTimeSeconds / 60;
  if (travelMinutes > 30 && snap.incomingAttacks.length > 0) return -1;

  // 15.2a — Anti-frustration : pas d'attaque joueur avant 5 min pour bot niveau ≤ 3
  if (snap.noEarlyPlayerAttack && t.type === 'player') return -1;

  // Guard : suicide — puissance offensive insuffisante
  // 15.1 — attackRecklessness : bas niveau attaque avec un ratio moindre (plus téméraire)
  if (snap.offensivePower < t.defensivePower * 0.6 * snap.attackRecklessness) return -1;

  // Guard : armée insuffisante pour attaquer (évite les raids à 1 axeman)
  if (offensiveTroopsHome(snap) < MIN_OFFENSIVE_TROOPS_TO_ATTACK) return -1;

  // 18.2 — Préparation avant noble : le score boost (×1.3) est appliqué dans computeAllScores.
  // On ne bloque PAS ici : le guard standard à 0.6× suffit pour éviter les suicides.

  // 27.2 — Cooldown adaptatif : ne pas réattaquer trop vite (victoire=3t, défaite=15t)
  if ((t.attackCooldownRemaining ?? 0) > 0) return -1;

  // Guard : cible récemment pillée
  const recentlyRaided =
    t.lastScouted !== null &&
    Date.now() - t.lastScouted < 5 * 60 * 1000;
  if (recentlyRaided && t.estimatedResources < 200) return -1;

  // Probabilité de victoire (modèle Lanchester simplifié)
  const forceRatio     = snap.offensivePower / Math.max(t.defensivePower, 1);
  const winProbability = 1 - Math.exp(-forceRatio * 0.8);

  const distanceMalus   = normalize(t.distanceTiles, 0, 30) * 0.05;
  const lootScore        = normalize(t.estimatedResources, 0, 3000);
  const ptsScore         = normalize(t.points, 0, 2000);
  const lossPenalty      = normalize(t.defensivePower * 0.3, 0, 500);
  const recentRaidMalus  = recentlyRaided ? 0.5 : 1.0;

  // Bonus conquête en late sur cibles joueurs (points + domination)
  const conquestBonus = phase === 'late' && t.type === 'player' ? 1.4 : 1.0;

  // 27.1 — Bonus farm : villages barbares = cibles prioritaires (ressources garanties, 0 contre-attaque)
  const farmBonus = t.type === 'barbarian' ? 2.0 : 1.0;

  // Renseignement : bonus si cible récemment scoutée (info fraîche = attaque plus précise)
  const scoutBonus = t.lastScouted !== null ? 1.2 : 1.0;

  // Malus si joueur non scouté en mid : mieux vaut espionner avant d'attaquer
  const unknownPenalty = (t.type === 'player' && t.lastScouted === null && phase === 'mid')
    ? 0.7
    : 1.0;

  return (
    (W.W_loot * lootScore + W.W_pts * ptsScore)
    * winProbability
    * conquestBonus
    * farmBonus
    * scoutBonus
    * unknownPenalty
    * recentRaidMalus
    - W.W_loss * lossPenalty
    - distanceMalus
  );
}

// ── Score : espionner une cible ───────────────────────────────

function scoreScout(t: BotTarget, snap: GameSnapshot, phase: Phase): number {
  if (phase === 'early') return 0;
  if (t.type === 'barbarian') return 0;

  // Pas besoin de re-scoutersi espionnage récent (< 10 min réelles)
  if (t.lastScouted !== null && Date.now() - t.lastScouted < 10 * 60 * 1000) return 0;

  const scoutsHome = snap.troopsHome['scout'] ?? 0;
  if (scoutsHome < 1) return 0;

  const valueBon    = normalize(t.points, 0, 2000) * 0.6;
  const distPenalty = normalize(t.distanceTiles, 0, 30) * 0.3;
  // Bonus si jamais espionné : priorité au renseignement en mid
  const unknownBonus = (t.lastScouted === null && phase === 'mid') ? 0.3 : 0;

  return valueBon - distPenalty + unknownBonus;
}

// ── Score : rappeler une armée en transit ─────────────────────

function scoreRecall(atk: BotOutgoingAttack, snap: GameSnapshot): number {
  // Pas d'attaque entrante → inutile de rappeler
  if (snap.incomingAttacks.length === 0) return 0;

  // Trouver l'attaque entrante la plus proche
  const earliestIncomingSec = Math.min(...snap.incomingAttacks.map(a => a.arrivalTimeSeconds));

  // Rappel utile seulement si les troupes reviendraient AVANT l'impact
  if (atk.returnEstimatedSeconds >= earliestIncomingSec) return 0;

  // Plus les vagues sont nombreuses, plus c'est urgent (base 0.3 + bonus)
  const urgency    = Math.min(1, snap.incomingAttacks.length / 3);
  // Plus les troupes arrivent tôt avant l'impact, plus le cushion est confortable
  const timeCushion = 1 - normalize(atk.returnEstimatedSeconds, 0, earliestIncomingSec);

  return 0.3 + urgency * 0.3 + timeCushion * 0.2;
}

// ── Score : transférer des troupes vers un village allié (21.2) ─

function scoreTransfer(ally: AlliedVillageInfo, snap: GameSnapshot, phase: Phase): number {
  // Guard : pas de transfert en early
  if (phase === 'early') return 0;
  // Guard : le village courant est lui-même sous attaque
  if (snap.incomingAttacks.length > 0) return 0;
  // Trigger : allié sous pression de loyauté ET surplus offensif suffisant
  if (ally.loyaltyPoints >= 40) return 0;
  if (snap.offensivePower < snap.attackCapacity * 2) return 0;
  // Score selon l'urgence : plus la loyauté est basse, plus c'est urgent
  const urgency = normalize(40 - ally.loyaltyPoints, 0, 40);
  return 0.5 + urgency * 0.5; // 0.5 → 1.0
}

// ── Score : noble train (24.1) ────────────────────────────────
// Envoie un cleaner + N nobles en rafale sur la cible de conquête.
// Priorité absolue quand le bot a ≥1 noble et une cible désignée.

function scoreNobleTrain(t: BotTarget, snap: GameSnapshot): number {
  if (t.id !== snap.conquestTargetId) return 0;
  if (!snap.rallyPointBuilt) return 0;

  const noblesHome = snap.troopsHome['noble'] ?? 0;
  if (noblesHome < 1) return 0;

  // Besoin d'un minimum de troupes offensives pour le cleaner (sinon le noble arrive seul)
  if (snap.offensivePower < 200) return 0;

  // 26.1 — Cleaner efficace : le cleaner (80 % des offensifs) doit être ≥ 2× la défense connue.
  // Évite d'envoyer des nobles derrière un cleaner trop faible qui se ferait anéantir.
  const estimatedCleanerPow = snap.offensivePower * 0.8;
  if (estimatedCleanerPow < t.defensivePower * 2) return 0;

  // Score croît avec le nombre de nobles disponibles (1→8.0, 3+→10.0)
  const nobleFactor = Math.min(noblesHome / 3, 1.0);
  return 8.0 + nobleFactor * 2.0;
}

// ── Calcul de l'ensemble des actions candidates ───────────────

export function computeAllScores(
  snap:    GameSnapshot,
  phase:   Phase,
  weights: Record<string, PhaseWeights> = PHASE_WEIGHTS,
): ScoredAction[] {
  const actions: ScoredAction[] = [];
  const W = weights[phase];

  // ── Construire ────────────────────────────────────────────
  for (const b of snap.availableBuildings) {
    const score = scoreBuild(b, snap, phase, W);
    if (score === -Infinity) continue;
    actions.push({
      type:       'build',
      targetId:   b.id,
      score,
      debugLabel: `build:${b.id}:lv${b.nextLevel}`,
    });
  }

  // ── Recruter ──────────────────────────────────────────────

  // Phase 16.2 — Réserve endgame pour l'académie
  // En late sans académie construite (noble pas disponible), réserver 25 % du stockage
  // par ressource pour ne pas bloquer la construction de l'académie.
  const academyUnlocked = snap.availableUnits.some(u => u.id === 'noble');
  const reserveFraction  = (phase === 'late' && !academyUnlocked) ? 0.25 : 0;
  const reserveW = snap.maxStorage * reserveFraction;
  const reserveS = snap.maxStorage * reserveFraction;
  const reserveI = snap.maxStorage * reserveFraction;
  // Ressources disponibles après réserve (jamais négatif)
  const availW = Math.max(0, snap.wood  - reserveW);
  const availS = Math.max(0, snap.stone - reserveS);
  const availI = Math.max(0, snap.iron  - reserveI);

  for (const u of snap.availableUnits) {
    const score = scoreRecruit(u, snap, phase, W);
    if (score <= 0) continue;

    // Phase 16.1 — Recrutement de masse en mid/late pour les offensifs
    // Batch max : 10 (au lieu de 5) pour accélérer l'accumulation de l'armée
    const maxBatch = (u.type === 'conquest' || u.id === 'paladin') ? 1
      : u.id === 'scout' ? 3
      : (u.type === 'offensive' && phase !== 'early') ? 10
      : 5;

    // Chercher le plus grand batch abordable compte tenu de la réserve endgame
    let count = 0;
    for (let n = maxBatch; n >= 1; n--) {
      const bw = u.cost.wood  * n;
      const bs = u.cost.stone * n;
      const bi = u.cost.iron  * n;
      if (availW >= bw && availS >= bs && availI >= bi) {
        count = n;
        break;
      }
    }
    if (count === 0) continue;

    // Légère prime de score pour les grands batchs : encourage à regrouper les ordres
    // (×1.0 pour 1 unité … ×1.25 pour 10 unités)
    const batchBonus = 1.0 + (count - 1) * 0.025;

    actions.push({
      type:       'recruit',
      targetId:   u.id,
      score:      score * batchBonus,
      debugLabel: `recruit:${u.id}×${count}`,
      count,
    });
  }

  // ── Attaquer ──────────────────────────────────────────────
  for (const t of snap.allTargets) {
    const score = scoreAttack(t, snap, phase, W);
    if (score <= 0) continue;

    // Proportion de troupes envoyées selon le profil de la cible :
    // - Barbare/abandonné (0 défense) → 80% (razzia max)
    // - Joueur faible (force ratio > 2) → 60%
    // - Joueur fort → 50% (garder une réserve défensive)
    const ratio = t.type === 'barbarian' ? 0.8
      : snap.offensivePower > t.defensivePower * 2 ? 0.6
      : 0.5;

    const units: Record<string, number> = {};
    for (const [unitType, count] of Object.entries(snap.troopsHome)) {
      if (count <= 0) continue;
      const role = getUnitRole(unitType);
      if (role === 'offensive' || role === 'siege') {
        units[unitType] = Math.floor(count * ratio);
      }
    }

    // 14.2 — Inclure le noble si cible de conquête (réduction de loyauté)
    const isConquestTarget = t.id === snap.conquestTargetId;
    if (isConquestTarget && (snap.troopsHome['noble'] ?? 0) > 0) {
      units['noble'] = 1;
    }

    // 19.2 — Noble bodyguard : si noble inclus, vérifier l'escorte minimale (15 offensifs)
    // Évite les suicides de nobles avec seulement 2–3 axemen d'escorte
    if (isConquestTarget && (units['noble'] ?? 0) > 0) {
      let offEscort = 0;
      for (const [type, count] of Object.entries(units)) {
        if (UNIT_ROLE_MAP[type] === 'offensive') offEscort += count;
      }
      if (offEscort < 15) continue; // escorte insuffisante → bloquer l'attaque noble
    }

    const totalSent = Object.values(units).reduce((s, c) => s + c, 0);
    if (totalSent < 1) continue;

    // 25.2 — Bonus focus : ×1.5 sur TOUTES les attaques vers la cible verrouillée
    const lockedBonus = isConquestTarget ? 1.5 : 1.0;

    // Bonus conquête en late (avec noble) : ×2.0 supplémentaire
    const conquestBoost = isConquestTarget && (units['noble'] ?? 0) > 0 ? 2.0 : 1.0;

    actions.push({
      type:       'attack',
      targetId:   t.id,
      score:      score * conquestBoost * lockedBonus,
      debugLabel: `attack:${t.type}:${t.id}`,
      units,
    });
  }

  // ── Transférer des troupes vers un allié ──────────────────
  for (const ally of snap.alliedVillages) {
    const score = scoreTransfer(ally, snap, phase);
    if (score <= 0) continue;

    // 30 % des défensifs disponibles — renforcent la défense de l'allié
    const units: Record<string, number> = {};
    for (const [unitType, count] of Object.entries(snap.troopsHome)) {
      if (count <= 0) continue;
      if (getUnitRole(unitType) === 'defensive') {
        const toSend = Math.floor(count * 0.3);
        if (toSend >= 1) units[unitType] = toSend;
      }
    }
    const totalSent = Object.values(units).reduce((s, c) => s + c, 0);
    if (totalSent < 5) continue; // trop peu pour être utile

    actions.push({
      type:       'transfer',
      targetId:   ally.id,
      score,
      debugLabel: `transfer:${ally.id.slice(-6)}`,
      units,
    });
  }

  // ── Noble Train (24.1) ────────────────────────────────────
  // Priorité absolue en late quand on a des nobles prêts sur la cible de conquête.
  // Envoie un cleaner (80 % des offensifs) + tous les nobles en rafale décalée.
  if (phase === 'late') {
    for (const t of snap.allTargets) {
      const score = scoreNobleTrain(t, snap);
      if (score <= 0) continue;

      const noblesHome = snap.troopsHome['noble'] ?? 0;

      // Cleaner : 80 % des offensifs (laisser 20 % pour la défense du village)
      const cleanerUnits: Record<string, number> = {};
      for (const [unitType, count] of Object.entries(snap.troopsHome)) {
        if (count <= 0) continue;
        const role = getUnitRole(unitType);
        if (role === 'offensive' || role === 'siege') {
          const toSend = Math.floor(count * 0.8);
          if (toSend >= 1) cleanerUnits[unitType] = toSend;
        }
      }
      const cleanerTotal = Object.values(cleanerUnits).reduce((s, n) => s + n, 0);
      if (cleanerTotal < 5) continue; // cleaner trop faible

      actions.push({
        type:         'noble_train',
        targetId:     t.id,
        score,
        debugLabel:   `noble_train:${noblesHome}×noble→${t.id}`,
        units:        { noble: noblesHome },    // nobles à envoyer
        cleanerUnits,                           // troupe de nettoyage
      });
    }
  }

  // ── Espionner ─────────────────────────────────────────────
  for (const t of snap.allTargets) {
    if (t.type !== 'player') continue;
    const score = scoreScout(t, snap, phase);
    if (score <= 0) continue;
    actions.push({
      type:       'scout',
      targetId:   t.id,
      score,
      debugLabel: `scout:${t.id}`,
      count:      3,
    });
  }

  // ── Rappeler des troupes ──────────────────────────────────
  for (const atk of snap.outgoingTraveling) {
    const score = scoreRecall(atk, snap);
    if (score <= 0) continue;
    actions.push({
      type:       'recall',
      targetId:   atk.id,
      score,
      debugLabel: `recall:${atk.id.slice(-6)}`,
    });
  }

  // ── Idle (fallback) ───────────────────────────────────────
  actions.push({
    type:       'idle',
    targetId:   '',
    score:      0.01,
    debugLabel: 'idle',
  });

  return actions;
}

// ── Helpers privés ────────────────────────────────────────────

const UNIT_ROLE_MAP: Record<string, string> = {
  axeman: 'offensive', light_cavalry: 'offensive', mounted_archer: 'offensive',
  catapult: 'siege', ram: 'siege',
  spearman: 'defensive', swordsman: 'defensive', archer: 'defensive',
  heavy_cavalry: 'defensive', paladin: 'defensive',
  scout: 'scout', noble: 'conquest',
};

function getUnitRole(unitType: string): string {
  return UNIT_ROLE_MAP[unitType] ?? 'defensive';
}

// ── Self-test ─────────────────────────────────────────────────
if (require.main === module) {
  const baseSnap: GameSnapshot = {
    villageId: 'test',
    wood: 5000, stone: 5000, iron: 5000, maxStorage: 20000,
    buildQueueCount: 0,
    availableBuildings: [
      {
        id: 'timber_camp', name: 'Camp de bois', currentLevel: 2, nextLevel: 3,
        cost: { wood: 72, stone: 86, iron: 58 }, buildTimeSeconds: 10,
        productionGainPerHour: 8, defenseBonus: 0, isUnlocked: true, isInQueue: false,
      },
      {
        id: 'academy', name: 'Académie', currentLevel: 0, nextLevel: 1,
        cost: { wood: 28000, stone: 30000, iron: 25000 }, buildTimeSeconds: 180,
        productionGainPerHour: 0, defenseBonus: 0, isUnlocked: false, isInQueue: false,
      },
    ],
    recruitQueues: { barracks: false, stable: false, garage: false },
    availableUnits: [
      {
        id: 'axeman', name: 'Guerrier à la hache', buildingType: 'barracks',
        type: 'offensive', attack: 40, defenseGeneral: 10, defenseCavalry: 5,
        defenseArcher: 10, speedSecondsPerTile: 0.54, cost: { wood: 60, stone: 30, iron: 40 },
        recruitTimeSeconds: 0.6, carryCapacity: 10, isUnlocked: true,
      },
    ],
    allTargets: [
      {
        id: 'v1', type: 'barbarian', distanceTiles: 3, travelTimeSeconds: 5,
        estimatedResources: 3000, defensivePower: 50, points: 0, lastScouted: null,
      },
      {
        id: 'v2', type: 'player', distanceTiles: 8, travelTimeSeconds: 15,
        estimatedResources: 8000, defensivePower: 200, points: 500, lastScouted: null,
      },
    ],
    incomingAttacks:   [],
    outgoingTraveling: [],
    troopsHome: { axeman: 50, spearman: 30 },
    troopsInTransit: {},
    offensivePower: 50 * 40,
    defensivePower: 30 * 15,
    defenseThreshold: 200, attackCapacity: 500,
    minesLevel: 3, barracksLevel: 1, wallLevel: 0, rallyPointBuilt: true,
    populationAvailable: 100, loyaltyPoints: 100,
    bottleneckResource: null, conquestTargetId: null, alliedVillages: [],
    attackRecklessness: 1.0, noEarlyPlayerAttack: false,
    timeElapsedMinutes: 20, recentHeavyLoss: false,
  };

  const scores = computeAllScores(baseSnap, 'mid');
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  console.log('Top actions (phase=mid) :');
  sorted.slice(0, 5).forEach(a =>
    console.log(`  ${a.debugLabel.padEnd(35)} score=${a.score.toFixed(4)}`),
  );

  const mine   = scores.find(a => a.targetId === 'timber_camp');
  const acad   = scores.find(a => a.targetId === 'academy');
  const axe    = scores.find(a => a.targetId === 'axeman');
  const barb   = scores.find(a => a.type === 'attack' && a.targetId === 'v1');
  const idle   = scores.find(a => a.type === 'idle')!;

  console.assert(mine !== undefined,              '❌ mine doit être scorée');
  console.assert(acad === undefined,              '❌ academy ne doit pas être scorée en mid');
  console.assert(axe !== undefined,               '❌ axeman doit être scoré en mid');
  console.assert(barb !== undefined,              '❌ attaque barbare doit être scorée (50 axemen)');
  console.assert(idle.score === 0.01,             '❌ idle doit valoir 0.01');
  console.assert((mine?.score ?? 0) > idle.score, '❌ mine doit scorer > idle');

  const earlyScores = computeAllScores({ ...baseSnap, timeElapsedMinutes: 5 }, 'early');
  const axeEarly    = earlyScores.find(a => a.targetId === 'axeman');
  console.assert(axeEarly === undefined, '❌ axeman ne doit pas être scoré en early');

  // Pas d'attaque si armée < 10 offensifs
  const fewTroops  = { ...baseSnap, troopsHome: { axeman: 5, spearman: 30 }, offensivePower: 5*40 };
  const fewScores  = computeAllScores(fewTroops, 'mid');
  const fewAtk     = fewScores.find(a => a.type === 'attack');
  console.assert(fewAtk === undefined, '❌ attaque bloquée si < 10 offensifs');

  console.log('\nTous les assertions passées ✓');
}
