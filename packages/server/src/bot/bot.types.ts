// ─────────────────────────────────────────────────────────────
// bot.types.ts — Interfaces TypeScript du bot IA
// Le bot travaille exclusivement avec ces structures,
// jamais avec les objets Prisma bruts.
// ─────────────────────────────────────────────────────────────

export type Phase = 'early' | 'mid' | 'late';

export type ActionType = 'build' | 'recruit' | 'attack' | 'scout' | 'recall' | 'idle' | 'transfer' | 'noble_train';

/** Style comportemental tiré aléatoirement à la création du bot (15.3) */
export type BotStyle = 'rusher' | 'builder' | 'balanced' | 'defender';

// ── Snapshot complet du village bot au moment du tick ────────
export interface GameSnapshot {
  villageId:   string;

  // Ressources actuelles
  wood:        number;
  stone:       number;
  iron:        number;
  maxStorage:  number;

  // Construction
  buildQueueCount:    number;           // 0, 1 ou 2 (max 2 slots)
  availableBuildings: BotBuilding[];

  // Recrutement
  recruitQueues:   Record<string, boolean>; // { barracks: true, stable: false, ... }
  availableUnits:  BotUnit[];

  // Cibles visibles (filtrées par visionRadius selon le profil)
  allTargets: BotTarget[];

  // Défense
  incomingAttacks:   BotIncomingAttack[];
  outgoingTraveling: BotOutgoingAttack[]; // attaques en aller (rappelables)
  troopsHome:       Record<string, number>; // unités présentes au village
  troopsInTransit:  Record<string, number>; // en déplacement — NE comptent PAS pour la défense
  defensivePower:   number;                 // Σ(count × defGeneral) troupes home défensives
  defenseThreshold: number;                 // seuil d'alerte configurable

  // Offense
  offensivePower:  number; // Σ(count × attack) troupes home offensives
  attackCapacity:  number; // seuil de troupes off. pour lancer une attaque rentable

  // Niveaux des bâtiments clés
  minesLevel:      number; // moyenne (timber_camp + quarry + iron_mine) / 3
  barracksLevel:   number;
  wallLevel:       number;
  rallyPointBuilt: boolean;

  // Population
  populationAvailable: number; // pop libre (ferme capacity − pop utilisée)

  // Économie
  bottleneckResource:  'wood' | 'stone' | 'iron' | null; // ressource la plus déficitaire (13.1)

  // Conquête
  conquestTargetId:    string | null; // village joueur visé pour la conquête (14.2)
  alliedVillages:      AlliedVillageInfo[]; // villages alliés (21.1)

  // 28.2 — Style comportemental (utilisé pour booster les mines adaptées au style)
  botStyle?: BotStyle;

  // Calibrage (15.1 & 15.2)
  attackRecklessness:   number;  // multiplicateur du seuil d'attaque (1.0 = normal, 0.3 = téméraire)
  noEarlyPlayerAttack:  boolean; // true → bot niveau ≤ 3 ne peut pas attaquer les joueurs avant 5 min

  // État du village
  loyaltyPoints: number; // < 30 → forcer mode défensif

  // 27.3 — Reconstruction urgente après grosse défaite
  recentHeavyLoss: boolean; // true si >10 troupes perdues au dernier combat

  // Timing
  timeElapsedMinutes: number; // minutes depuis le début du monde
}

// ── Bâtiment constructible ───────────────────────────────────
export interface BotBuilding {
  id:                   string;
  name:                 string;
  currentLevel:         number;
  nextLevel:            number;
  cost:                 { wood: number; stone: number; iron: number };
  populationCost?:      number;
  buildTimeSeconds:     number;   // déjà divisé par gameSpeed
  productionGainPerHour: number;  // 0 si pas de production
  defenseBonus:         number;   // 0 si pas de bonus défensif
  isUnlocked:           boolean;
  isInQueue:            boolean;
}

// ── Unité recrutble ──────────────────────────────────────────
export interface BotUnit {
  id:                  string;
  name:                string;
  buildingType:        string; // 'barracks' | 'stable' | 'garage' | 'statue' | 'academy'
  type:                'offensive' | 'defensive' | 'scout' | 'siege' | 'conquest';
  attack:              number;
  defenseGeneral:      number;
  defenseCavalry:      number;
  defenseArcher:       number;
  speedSecondsPerTile: number; // déjà divisé par gameSpeed
  cost:                { wood: number; stone: number; iron: number };
  populationCost:      number;
  recruitTimeSeconds:  number; // par unité, déjà divisé par gameSpeed
  carryCapacity:       number;
  isUnlocked:          boolean;
}

// ── Cible (barbare ou joueur) ────────────────────────────────
export interface BotTarget {
  id:                 string;
  type:               'barbarian' | 'player';
  distanceTiles:      number;
  travelTimeSeconds:  number;  // aller simple, déjà divisé par gameSpeed
  estimatedResources: number;  // estimation (biaisée selon le profil de difficulté)
  defensivePower:     number;
  points:             number;
  lastScouted:        number | null; // timestamp Unix du dernier espionnage
  loyaltyPoints?:     number;        // loyauté connue via scout (22.2), undefined si non scouté
  // 27.2 — Cooldown adaptatif : nombre de ticks avant de pouvoir réattaquer cette cible
  attackCooldownRemaining?: number;  // 0 = disponible, >0 = bloqué
}

// ── Attaque entrante ─────────────────────────────────────────
export interface BotIncomingAttack {
  id:                  string;
  attackerPower:       number;
  arrivalTimeSeconds:  number; // secondes avant impact
  isConfirmed:         boolean;
}

// ── Attaque sortante rappelable ───────────────────────────────
export interface BotOutgoingAttack {
  id:                      string;
  units:                   Record<string, number>;
  returnEstimatedSeconds:  number; // secondes avant retour si on rappelle maintenant
}

// ── Village allié (21.1) ──────────────────────────────────────
export interface AlliedVillageInfo {
  id:             string;
  offensivePower: number;
  defensivePower: number;
  phase:          Phase;
  loyaltyPoints:  number;
}

// ── Hub de coordination inter-villages (21.3) ────────────────
export interface ICoordinationHub {
  register(botPlayerId: string, villageId: string, conquestTarget: string): void;
  shouldFire(villageId: string): boolean;
  consume(villageId: string): void;
  deregister(villageId: string, botPlayerId: string): void;
}

// ── Action scorée (sortie du ScoreEngine) ───────────────────
export interface ScoredAction {
  type:       ActionType;
  targetId:   string;            // buildingId, unitType, ou villageId selon le type
  score:      number;
  debugLabel: string;            // ex: "build:barracks:lv2 → 0.74"
  // Paramètres additionnels selon le type
  units?:        Record<string, number>; // pour 'attack' et 'noble_train' (nobles)
  count?:        number;                 // pour 'recruit'
  cleanerUnits?: Record<string, number>; // pour 'noble_train' : troupes off envoyées en cleaner
  catapultTarget?: string;               // bâtiment ciblé (ex: 'farm', 'wall')
}

// ── Profil de difficulté (calculé depuis le niveau 1–10) ─────
export interface DifficultyProfile {
  level:                number;          // 1–10
  apmDelayRange:        [number, number]; // ms entre deux décisions
  scoreNoiseEpsilon:    number;          // bruit multiplicatif sur les scores
  defenseIgnoreRate:    number;          // proba d'ignorer une alerte défensive
  visionRadius:         number;          // rayon de vision en cases
  resourceWasteRate:    number;          // part des ressources "oubliées"
  lootEstimationBias:   number;          // biais sur l'estimation du butin ennemi
  // 15.1 — Calibrage offensif
  attackRecklessness:   number;          // 0.3 (téméraire) → 1.0 (prudent)
}

// ── Poids par phase pour le ScoreEngine ─────────────────────
export interface PhaseWeights {
  // Construction
  W_res:   number; // importance du ratio ressources dispo / coût
  W_prod:  number; // gain de production
  W_def:   number; // bonus défensif (mur)
  W_cost:  number; // pénalité coût
  W_time:  number; // pénalité temps de construction
  // Recrutement
  W_atk:       number; // puissance offensive
  W_def_unit:  number; // puissance défensive
  W_threat:    number; // multiplicateur si attaque entrante
  // Attaque
  W_loot: number; // valeur du butin
  W_pts:  number; // valeur des points
  W_loss: number; // pénalité pertes propres
}
