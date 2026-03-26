# Roadmap — Bot IA (monde persistant)

> Des bots qui peuplent le monde et jouent contre les vrais joueurs.
> Le joueur choisit un niveau de **1 à 10** à l'inscription.
> Les bots spawné autour de lui jouent à ce niveau.
> Si un bot se fait conquérir, il respawn ailleurs pour maintenir la carte peuplée.

---

## Vision

```
Joueur s'inscrit → choisit niveau 1–10
       ↓
Serveur spawne N bots au même niveau autour de lui
       ↓
Chaque bot joue en autonomie (build, recruit, attack, scout)
       ↓
Si un bot est conquis → respawn dans une zone libre
       ↓
Le joueur progresse → les bots autour de lui montent en niveau
```

---

## Niveau 1–10 : correspondance paramètres internes

| Niveau | Délai décision (ms) | Bruit score (ε) | Rayon vision (cases) | Ignore défense | Gaspillage ressources |
|--------|--------------------|-----------------|--------------------|----------------|----------------------|
| 1 | 8 000–12 000 | 0.55 | 5 | 50% | 40% |
| 2 | 6 000–9 000 | 0.45 | 8 | 40% | 30% |
| 3 | 4 000–6 000 | 0.35 | 10 | 30% | 22% |
| 4 | 3 000–5 000 | 0.28 | 14 | 22% | 16% |
| 5 | 2 000–3 500 | 0.20 | 18 | 15% | 10% |
| 6 | 1 500–2 500 | 0.14 | 22 | 10% | 6% |
| 7 | 1 000–1 800 | 0.09 | 28 | 5% | 3% |
| 8 | 600–1 200 | 0.05 | 40 | 2% | 1% |
| 9 | 400–700 | 0.03 | 80 | 0% | 0% |
| 10 | 200–500 | 0.01 | 9999 | 0% | 0% |

> Niveau 1 = bot qui fait des erreurs grossières, construit aléatoirement, oublie de se défendre.
> Niveau 10 = bot quasi-parfait, réagit aux attaques, cible les villages faibles, timing optimal.

---

## Architecture

```
packages/server/src/bot/
  ├── bot.types.ts        ← interfaces GameSnapshot, ScoredAction, etc.
  ├── bot.snapshot.ts     ← Prisma → GameSnapshot
  ├── bot.fsm.ts          ← transitions early / mid / late
  ├── bot.scores.ts       ← ScoreEngine (build / recruit / attack / scout)
  ├── bot.profile.ts      ← interpolation niveau 1–10 → DifficultyProfile
  ├── bot.brain.ts        ← classe BotBrain (tick + boucle)
  ├── bot.service.ts      ← spawn / stop / respawn des bots
  └── bot.module.ts       ← NestJS module
```

---

## Phases d'implémentation

---

### Phase 0 — Schéma & socle ✅
> Avant tout code IA, poser les fondations de données

#### 0.1 — Prisma : champ `botDifficulty` sur `Player`
```prisma
model Player {
  // ... champs existants
  botDifficulty  Int?   // niveau choisi par le joueur (1–10), null si non défini
}
```

#### 0.2 — Prisma : flag `isBot` sur `Village`
```prisma
model Village {
  // ... champs existants
  isBot          Boolean  @default(false)
  botDifficulty  Int?     // niveau du bot qui contrôle ce village
  botPlayerId    String?  // id du joueur "propriétaire" de ce bot
}
```
> `botPlayerId` permet de retrouver quel joueur a "généré" ce bot (pour le respawn et le scaling).

#### 0.3 — Migration + `prisma generate`

#### 0.4 — Fichier `bot.types.ts`
Interfaces TypeScript adaptées au jeu :
```typescript
type Phase = 'early' | 'mid' | 'late';

interface GameSnapshot {
  villageId:         string;
  wood: number; stone: number; iron: number;
  maxStorage:        number;
  buildQueueCount:   number;          // 0, 1 ou 2 (max 2 slots)
  recruitQueues:     Record<string, boolean>; // { barracks: true, stable: false, ... }
  availableBuildings: BotBuilding[];
  availableUnits:    BotUnit[];
  allTargets:        BotTarget[];
  incomingAttacks:   BotIncomingAttack[];
  troopsHome:        Record<string, number>; // unités au village
  troopsInTransit:   Record<string, number>; // unités en déplacement (ne comptent PAS pour la défense)
  offensivePower:    number;          // Σ(count × attack) des troupes home offensives
  defensivePower:    number;          // Σ(count × defGeneral) des troupes home défensives
  attackCapacity:    number;          // seuil de troupes off. pour lancer une attaque rentable
  minesLevel:        number;          // moyenne timber_camp + quarry + iron_mine
  barracksLevel:     number;
  wallLevel:         number;
  rallyPointBuilt:   boolean;
  loyaltyPoints:     number;          // si < 30, passer en mode défensif
  timeElapsedMinutes: number;
  startedAt:         number;
}

interface DifficultyProfile {
  apmDelayRange:       [number, number];
  scoreNoiseEpsilon:   number;
  defenseIgnoreRate:   number;
  visionRadius:        number;
  resourceWasteRate:   number;
  lootEstimationBias:  number;
}
```

---

### Phase 1 — Interpolation des niveaux 1–10 ✅
> `bot.profile.ts` — transforme un entier 1–10 en `DifficultyProfile`

```typescript
function buildProfile(level: number): DifficultyProfile {
  // level est clampé entre 1 et 10
  // Interpolation linéaire entre les bornes du tableau ci-dessus
  const t = (level - 1) / 9; // 0.0 à 1.0
  return {
    apmDelayRange:     [lerp(8000, 200, t), lerp(12000, 500, t)],
    scoreNoiseEpsilon: lerp(0.55, 0.01, t),
    defenseIgnoreRate: lerp(0.50, 0.00, t),
    visionRadius:      Math.round(lerp(5, 9999, t)),
    resourceWasteRate: lerp(0.40, 0.00, t),
    lootEstimationBias: lerp(0.55, 0.01, t),
  };
}
```
- Tests unitaires : niveau 1 = profil facile, niveau 10 = profil difficile, niveau 5 = valeurs médianes

---

### Phase 2 — GameSnapshot (adaptateur Prisma) ✅
> `bot.snapshot.ts` — lit la BDD et construit un `GameSnapshot` propre

- Lit `village` + `troops` + `buildingInstances` + `buildingQueueItems`
- Calcule `troopsHome` vs `troopsInTransit` (depuis `ActiveAttack` status `traveling`)
- Calcule `offensivePower` : unités offensives home (axeman, light_cavalry, mounted_archer, catapult)
- Calcule `defensivePower` : unités défensives home (spearman, swordsman, archer, heavy_cavalry)
- Remplit `allTargets` depuis les villages à `visionRadius` cases (filtrés selon le profil)
- Estime `estimatedResources` d'une cible = (wood+stone+iron) maxStorage × taux de remplissage estimé
- `timeElapsedMinutes` = `(Date.now() - world.startsAt) / 60000`

---

### Phase 3 — FSM (transitions de phase) ✅
> `bot.fsm.ts`

```typescript
function evaluatePhase(current: Phase, snap: GameSnapshot): Phase {
  if (current === 'early') {
    const normal  = snap.minesLevel >= 3 && snap.barracksLevel >= 1 && snap.timeElapsedMinutes >= 15;
    const urgency = snap.incomingAttacks.length > 0 && snap.defensivePower < snap.attackCapacity * 0.5;
    if (normal || urgency) return 'mid';
  }
  if (current === 'mid') {
    const normal       = snap.offensivePower >= snap.attackCapacity && snap.timeElapsedMinutes >= 40;
    const opportunist  = snap.allTargets.some(
      t => t.type === 'player' && snap.offensivePower / Math.max(t.defensivePower, 1) >= 1.8
    ) && snap.timeElapsedMinutes >= 30;
    if (normal || opportunist) return 'late';
  }
  return current;
}
```

**Priorités par phase :**

| Phase | Durée | Priorité 1 | Priorité 2 | Priorité 3 | Interdit |
|-------|-------|-----------|-----------|-----------|---------|
| early | 0–15 min | rally_point + mines L3 | warehouse | barracks L1 | recrut. offensif |
| mid | 15–40 min | recrut. axemen/LC | muraille | pillage barbares | constructions lentes |
| late | 40–∞ | conquête joueurs | défense totale | noble | mise à niveau mines |

---

### Phase 4 — Score Engine ✅
> `bot.scores.ts`

**`scoreBuild(building, snap, phase)`**
- Guard : `snap.buildQueueCount >= 2` → retourne -Infinity (file pleine)
- Guard : si `!snap.rallyPointBuilt` → seul `rally_point` peut scorer positivement en early
- Formule : `resRatio × W_res + prodGain × W_prod + defBonus × W_def - cost × W_cost - time × W_time`
- Poids `W_*` par phase (early favorise production, late favorise défense)

**`scoreRecruit(unit, snap, phase)`**
- Guard : `snap.recruitQueues[buildingForUnit(unit.id)]` occupée → retourne 0
- Guard : phase `early` + unité offensive → retourne 0 (interdit)
- Multiplicateur menace si `incomingAttacks.length > 0`
- Noble : scorer uniquement si `phase === 'late'` + ressources suffisantes (coût 40k/50k/50k)

**`scoreAttack(target, snap, phase)`**
- Guard : `travelSec * 2 > timeLeftSec` → retourne -1
- Guard : `snap.offensivePower < target.defensivePower * 0.6` → retourne -1 (suicide)
- Guard : pas de `rally_point` → retourne -1
- Probabilité victoire : `1 - exp(-forceRatio × 0.8)` (modèle Lanchester simplifié)
- Bonus conquête × 1.4 en late sur cibles joueurs

**`scoreScout(target, snap, phase)`**
- Guard : phase `early` → retourne 0
- Guard : dernière espionnage < 5 min réelles → retourne 0
- Valeur selon points de la cible − pénalité distance

**`computeAllScores(snap, phase): ScoredAction[]`**
- Itère bâtiments + unités + cibles + action idle (score 0.01)

**Poids par phase :**
```typescript
const PHASE_WEIGHTS = {
  early: { W_res: 0.90, W_prod: 0.85, W_def: 0.25, W_cost: 0.60, W_time: 0.55,
           W_atk: 0.15, W_def_unit: 0.70, W_loot: 0.60, W_pts: 0.15, W_loss: 0.95 },
  mid:   { W_res: 0.50, W_prod: 0.45, W_def: 0.65, W_cost: 0.35, W_time: 0.30,
           W_atk: 0.85, W_def_unit: 0.50, W_loot: 0.80, W_pts: 0.50, W_loss: 0.60 },
  late:  { W_res: 0.15, W_prod: 0.10, W_def: 0.90, W_cost: 0.15, W_time: 0.10,
           W_atk: 0.95, W_def_unit: 0.85, W_loot: 0.40, W_pts: 0.95, W_loss: 0.35 },
};
```

---

### Phase 5 — BotBrain (boucle principale) ✅
> `bot.brain.ts`

```typescript
class BotBrain {
  private phase: Phase = 'early';

  constructor(
    private villageId: string,
    private level: number,        // 1–10
    private profile: DifficultyProfile,
    private prisma: PrismaClient,
    private gameData: GameDataRegistry,
    private services: { buildings, troops, combat },
  ) {}

  async tick(raw: GameSnapshot): Promise<ScoredAction>
  async start(): Promise<void>
  stop(): void
}
```

**`tick()`** :
1. `evaluatePhase()` → mise à jour de `this.phase`
2. Appliquer `resourceWaste`, `filterByVision()`, `lootBias()`
3. Ignorer les alertes selon `defenseIgnoreRate`
4. `computeAllScores()` + `applyNoise(ε)` sur chaque score
5. Sélectionner le meilleur (`reduce max`)
6. `sleep(apmDelay)` humanisation
7. Logger + retourner

**`start()`** :
```typescript
while (this.isRunning) {
  const snap = await getSnapshot(this.villageId, ...);
  // Loyauté critique → passer en mode défensif
  if (snap.loyaltyPoints < 30) this.phase = 'late'; // force défense
  const action = await this.tick(snap);
  if (action.type !== 'idle') await this.executeAction(action);
}
```

**`executeAction()`** :
- `build`   → `buildingsService.upgrade(villageId, buildingId)`
- `recruit` → `troopsService.recruit(villageId, { unitType, count: 5 })`
- `attack`  → `combatService.sendAttack(villageId, targetId, units)`
- `scout`   → `combatService.sendScout(villageId, targetId, 3)`

**Logging debug :**
```
[Bot:village_xxx] lvl=7 phase=mid t=22.4min → recruit:axeman (score=0.841)
[Bot:village_xxx] Top3: recruit:axeman:0.84 | build:wall:0.71 | attack:barbarian_42:0.65
```

---

### Phase 6 — BotService (spawn / stop / respawn) ✅
> `bot.service.ts`

```typescript
class BotService {
  private bots = new Map<string, BotBrain>(); // key = villageId

  // Spawner 1 bot au niveau `level` autour du joueur
  async spawnBotsForPlayer(playerId: string, level: number): Promise<void>

  // Appelé par le socket event 'village:conquered' si isBot=true
  async onBotConquered(botVillageId: string): Promise<void>

  stopBot(villageId: string): void
  stopAll(): void
}
```

**`spawnBotsForPlayer()`** :
1. Lire le village du joueur pour obtenir ses coordonnées
2. Trouver **1** position libre à distance 5–15 cases
3. `prisma.village.create({ isBot: true, botDifficulty: level, botPlayerId: playerId, ... })`
4. Créer un `Player` fictif dédié à ce bot
5. Initialiser les bâtiments de départ (même que `AuthService.register`)
6. Instancier `BotBrain` + démarrer en promesse non-bloquante

> **1 seul bot par joueur au départ.** Pas de scaling automatique.

**`onBotConquered()`** :
1. Stopper l'ancien `BotBrain`
2. Trouver une position libre sur la carte
3. Spawner un nouveau village bot au même niveau
4. Redémarrer un `BotBrain` → la carte reste toujours peuplée

---

### Phase 7 — Intégration au register ✅

#### 7.1 — Backend : `AuthService.register()` accepte `botDifficulty`
```typescript
async register(data: { username, email, password, botDifficulty: number }) {
  // ...création du player + village existante...
  await tx.player.update({ where: { id: player.id }, data: { botDifficulty } });
  // Spawner 1 bot après la création du compte
  await botService.spawnBotsForPlayer(player.id, botDifficulty);
}
```

#### 7.2 — Backend : `auth.controller.ts` — passer `botDifficulty` au body
```typescript
const { username, email, password, botDifficulty = 5 } = request.body as any;
```

#### 7.3 — Mobile : `RegisterPage` — ajouter le sélecteur de niveau

Après le champ mot de passe, ajouter :

```
┌─────────────────────────────────────────┐
│  Niveau des adversaires                 │
│                                         │
│  [1]  [2]  [3]  [4]  [5]  [6]  [7]...  │  ← chips sélectionnables
│                                         │
│  Débutant ←─────────────── Expert       │
│  "Les bots feront des erreurs"          │
└─────────────────────────────────────────┘
```

- Widget `_DifficultyPicker` : Row de 10 chips numérotés, sélection amber
- Description dynamique selon le niveau sélectionné (3 niveaux de texte : 1–3 débutant, 4–7 intermédiaire, 8–10 expert)
- Valeur par défaut : **5**
- Envoyée dans le body du register : `{ ..., botDifficulty: _selectedLevel }`

#### 7.4 — Mobile : `AuthApi.register()` — passer `botDifficulty`
```dart
Future<Map<String, dynamic>> register(
  String username, String email, String password, int botDifficulty,
)
```

---

### Phase 8 — Intégration socket pour respawn ✅

Dans le worker `attack.worker.ts`, après une conquête (`triggerConquest`) :
```typescript
// Émettre un event dédié si le village conquis est un bot
if (defenderVillage.isBot) {
  fastify.io.emit('bot:conquered', { villageId: defenderVillageId });
}
```

Dans `main.ts` ou `bot.module.ts`, écouter cet event :
```typescript
io.on('bot:conquered', ({ villageId }) => {
  botService.onBotConquered(villageId);
});
```

---

### Phase 9 — Tests & calibrage ✅

- [x] `bot.test.ts` : 38 tests unitaires (runner ts-node autonome, sans Jest)
  - Suite 1 — bot.profile : 11 tests (bornes, pas de valeurs négatives, clamping, poids early/late)
  - Suite 2 — bot.fsm : 9 tests (4 transitions normales + urgences + loyauté force late)
  - Suite 3 — bot.scores : 18 tests (guards, restrictions de phase, idle, bonus late joueur)
- [x] Script npm : `npm run test:bot` → `ts-node src/bot/bot.test.ts`
- [x] Test intégration : bot observé en live (logs), attaque confirméeé avec axeman×14

---

### Phase 10 — Comportement tactique ✅
> Rendre les attaques plus intelligentes et cohérentes

#### 10.1 — Cooldown anti-spam d'attaque ✅
Tracker en mémoire (`BotBrain`) la dernière attaque par cible.
Ne pas retourner une cible si elle a été attaquée il y a moins de N minutes (selon gameSpeed).
```typescript
private lastAttackTime = new Map<string, number>(); // villageId → timestamp
```
Utiliser ce map dans `computeAllScores` pour invalider les cibles récentes.

#### 10.2 — Proportion de troupes envoyées adaptative ✅
Actuellement : 50% des offensifs envoyés.
- Cible barbare (0 défense) → envoyer 80% (razzia maximale)
- Cible joueur faible → envoyer 60%
- Cible joueur fort → 50% seulement (garder une réserve défensive)

#### 10.3 — Montée en niveau des casernes ✅
Le bot construit les mines mais ignore les casernes.
Ajouter un bonus de score pour `barracks` en phase mid quand `barracksLevel < 3`
afin d'accélérer le recrutement (−6% temps/niveau).

---

### Phase 11 — Renseignement & espionnage ✅
> Le bot collecte de l'information avant d'attaquer

#### 11.1 — Espionnage effectif des joueurs ✅
- `scout` recruté en priorité (score fixe 0.5) dès que `troopsHome['scout'] < 3` en mid/late
- `scoutMemory: Map<string, number>` dans `BotBrain` → persiste les timestamps d'espionnage
- `lastScouted` peuplé dans `getSnapshot()` depuis `scoutMemory`
- Écurie (stable) ajoutée aux `STARTER_BUILDINGS` pour tous les nouveaux bots

#### 11.2 — Attaque conditionnelle post-espionnage ✅
- Village joueur non scouté en mid → `unknownPenalty × 0.7` sur le score d'attaque
- Village scouté récemment → `scoutBonus × 1.2` sur le score d'attaque
- `scoreScout` : `unknownBonus +0.3` si jamais espionné en mid → incite à explorer d'abord

---

### Phase 12 — Défense réactive ✅
> Le bot réagit aux attaques entrantes

#### 12.1 — Recrutement d'urgence défensif ✅
- Dès qu'une attaque est détectée (`incomingAttacks.length > 0`) : tout recrutement offensif/siège est bloqué
- Les unités défensives (spearman, swordsman…) continuent d'être scorées normalement via `W_threat`

#### 12.2 — Retrait des troupes en transit ✅
- `BotOutgoingAttack` ajouté dans GameSnapshot : liste des attaques en aller avec leur temps de retour estimé
- `scoreRecall` : score positif si les troupes reviendraient avant l'impact (score 0.3–0.8 selon urgence)
- `combatService.recall(attackId)` : flip status → 'returning', schedule le job de retour avec le temps restant
- Action `'recall'` ajoutée à `ActionType` et gérée dans `BotBrain.executeAction`

#### 12.3 — Mode siège : fortification ✅
- Si `incomingAttacks.length >= 3` : toutes les attaques sortantes bloquées (`scoreAttack` → -1)
- Mur scoré à 8.5 (priorité absolue) si 3+ vagues entrantes et pas déjà en queue

---

### Phase 13 — Économie avancée ✅
> Optimiser la production et éviter les goulots d'étranglement

#### 13.1 — Détection de ressource bottleneck ✅
- `private resourceHistory` dans `BotBrain` : 10 derniers snapshots `{wood, stone, iron}`
- `computeBottleneck(maxStorage)` : détecte la ressource avec le ratio moyen le plus bas
- `bottleneckResource` injecté dans le GameSnapshot à chaque tick
- `scoreBuild` : mine bottleneck ×1.5 | mine d'une ressource > 90% max → ×0.3

#### 13.2 — Gestion entrepôt ✅
- Si `max(wood, stone, iron) / maxStorage > 0.85` et le bâtiment DÉPENSE la ressource qui déborde → bonus +0→0.6 (urgence croissante jusqu'à 100%)

#### 13.3 — Optimisation du ratio coût/temps ✅
- Si entrepôt > 85% plein ET `buildTimeSeconds > 600` (10 min jeu) → score ×0.5 (préférer les builds rapides qui dépensent maintenant)

---

### Phase 14 — Endgame & conquête ✅
> Préparer et exécuter la conquête de villages joueurs

#### 14.1 — Chaîne noble ✅
- Académie scorée 9.0 en late uniquement si `offensivePower > 2000` ET `total_res > 80 000`
- Noble recruté avec score fixe 3.5 dès qu'une `conquestTargetId` est définie et `nobles < 2`
- Noble non recruté si aucune cible de conquête (évite le gaspillage)

#### 14.2 — Attaque de conquête coordonnée ✅
- `private conquestTarget: string | null` dans `BotBrain` : village joueur le plus faible sélectionné en late quand noble disponible
- Noble inclus dans l'attaque sur `conquestTarget` (réduit la loyauté à chaque victoire, noble revient si pas de conquête)
- Cooldown désactivé pour la cible de conquête (attaques nobles répétées autorisées)
- Score ×2.0 sur l'attaque avec noble → priorité absolue en late
- Reset automatique de `conquestTarget` si la phase repasse en mid/early

#### 14.3 — Gestion multi-villages ✅
- `BotService.onBotConquest(attackerVillageId, conqueredVillageId)` : démarre un nouveau `BotBrain` pour le village conquis (même niveau de difficulté)
- Hook dans `attack.worker.ts` : si l'attaquant est un bot ET conquest → appel automatique
- Coordination défensive inter-villages : non implémentée (complexité trop élevée, reportée)

---

### Phase 15 — Calibrage & équilibrage ✅
> S'assurer que le bot est fun à jouer contre

#### 15.1 — Calibrage par niveau ✅
- Ajout de `attackRecklessness` dans `DifficultyProfile` (0.30 niveau 1 → 1.00 niveau 10)
- Niveau 1–3 attaquent même avec un ratio de force inférieur → perdent plus de combats
- Le seuil `offensivePower < defensivePower * 0.6 * attackRecklessness` remplace le guard fixe
- Niveau 7–10 restent prudents et n'attaquent qu'avec une supériorité confirmée

#### 15.2 — Anti-frustration ✅
- `noEarlyPlayerAttack` : bots niveau ≤ 3 ne peuvent pas attaquer les joueurs pendant les 5 premières minutes (`timeElapsedMinutes < 5`), mais continuent à piller les barbares
- `pauseUntil` dans `BotBrain` : si la défense du bot chute de >50% entre deux ticks (bataille reçue) et niveau ≤ 3, pause de 2 min réelles avant de reprendre les attaques joueur

#### 15.3 — Variété comportementale ✅
- Nouveau type `BotStyle = 'rusher' | 'builder' | 'balanced'` dans `bot.types.ts`
- `buildStyleWeights(style)` dans `bot.profile.ts` retourne des `PHASE_WEIGHTS` ajustés :
  - `rusher` : W_atk +0.30, W_loot +0.20 en early/mid ; W_prod -0.20
  - `builder` : W_prod +0.20, W_res +0.15 en early/mid ; W_atk -0.20
  - `balanced` : poids standards inchangés
- Style tiré aléatoirement dans `BotBrain` constructor, passé à `computeAllScores`
- `computeAllScores` accepte un 3ème paramètre `weights` (défaut : `PHASE_WEIGHTS`)

---

### Phase 16 — Recrutement en batch ✅
> Observation duel : les bots recrutent 1 unité/tick au lieu de regrouper les ordres
> → accumulation lente de l'armée, arrivée en endgame très tardive

#### 16.1 — Recrutement de masse en mid/late ✅
- `maxBatch` passé de 5 à 10 pour les offensifs en mid/late dans `computeAllScores`
- Prime de score légère pour les grands batchs (×1.0 pour 1 unité, ×1.25 pour 10)
- Ne s'applique pas en early (recrutement offensif interdit)

#### 16.2 — Réserve endgame pour l'académie ✅
- En late sans académie construite (noble absent de `availableUnits`) : réserver 25 % du maxStorage par ressource
- Le batch de recrutement est calculé sur les ressources nettes (= disponible − réserve)
- Évite de dépenser les ressources prévues pour l'académie en recrutant des troupes

---

### Phase 17 — Résilience défensive ✅
> Observation duel : le bot perdant tombe dans une spirale de pillages sans jamais se rétablir

#### 17.1 — Garde minimum de ressources ✅
- `scoreBuild` (mid/late uniquement) : bloquer si dépenser viderait en dessous de `maxStorage × 15 %`
- Exceptions : rally_point (toujours autorisé), académie (déjà gardée par son buffer 1.2×), mur sous attaque
- En early : guard désactivé — le bot doit développer librement avec peu de ressources

#### 17.2 — Recrutement défensif d'urgence ✅
- Si `loyaltyPoints < 50` ET `defensivePower < 200` : spearmen scorés à 5.0 (priorité absolue)
  quelque soit la phase → le bot se rétablit avant de relancer l'offensive
- Offensifs bloqués pendant cette urgence

#### 17.3 — Pause d'accumulation après pillage ✅
- Suivi de `lastResourceTotal` dans `BotBrain` : si total ressources chute de >20% en 1 tick → `raidPauseTicks = 3`
- Pendant la pause : `allTargets = []` (masquer les cibles) → le bot garde ses troupes pour défendre
- Logique distincte de `pauseUntil` (15.2b) qui gère les pertes de troupes

---

### Phase 18 — Décision de conquête intelligente ✅
> Observation duel : le bot cible toujours le même adversaire même quand il est vain de continuer

#### 18.1 — Sélection dynamique de cible de conquête ✅
- En late, réévaluer `conquestTargetId` tous les 20 ticks dans `BotBrain.tick()`
- Si la cible actuelle dépasse `offensivePower * 0.6` de défense → changer de cible
- Sélectionne le village joueur avec la `defensivePower` la plus faible parmi les cibles visibles
- Cooldown 20 ticks pour éviter les changements trop fréquents

#### 18.2 — Attaque de préparation avant noble ✅
- Dans `scoreAttack` : si `conquestTargetId === t.id` ET `noblesHome === 0`, guard renforcé à 1.5× la défense
  (vs 0.6× standard) — évite les attaques-suicide avant la conquête
- Dans `computeAllScores` : boost ×1.3 pour les attaques de préparation (pas de noble, phase late)
- Harcèle la cible pour réduire sa défense et financer le noble par le pillage

#### 18.3 — Abandon de conquête si impossible ✅
- Dans `BotBrain` : compteur `conquestFailStreak` incrémenté à chaque envoi de noble raté
- Si 5 échecs consécutifs → `conquestTargetId = null`, reset du compteur, réévaluation immédiate
- Reset du compteur à 0 à chaque envoi réussi d'une attaque avec noble

---

### Phase 19 — Optimisation endgame ✅
> Rendre l'endgame plus dynamique et moins prévisible

#### 19.1 — Diversification des unités offensives ✅
- `scoreRecruit` en late : si `light_cavalry` représente < 30 % de l'offensif total → boost ×1.5
- Cible de mix : 70 % axemen + 30 % cavalerie pour un meilleur rapport vitesse/force
- Ne s'active qu'en phase late si l'écurie est disponible (`isUnlocked: true`)

#### 19.2 — Noble bodyguard ✅
- Dans `computeAllScores` : si noble inclus dans l'attaque ET `offEscort < 15` → `continue` (attaque bloquée)
- Évite les suicides de nobles avec 2–3 axemen d'escorte
- Le bot attend d'avoir une armée suffisante avant d'envoyer le noble

#### 19.3 — Recrutement du 2ème noble ✅
- Dans `scoreRecruit` : si `noblesHome === 0` ET `noblesInTransit >= 1` → score 4.0 (priorité maximale)
- Permet de finir la conquête en 1–2 vagues au lieu de 5
- Guard : si `noblesHome + noblesInTransit >= 2` → score 0 (évite le sur-recrutement)

---

### Phase 20 — Simulation & validation automatique ✅
> `bot.duel.ts` a montré sa valeur — l'utiliser pour valider chaque amélioration

#### 20.1 — Métriques de qualité automatiques ✅
- `BotMetrics` exporté depuis `bot.duel.ts` : academyBuiltAt, nobleRecruitedAt, firstNobleSentAt, firstAttackAt
- `extractMetrics()` analyse le LOG pour extraire ces ticks par village
- `simulate()` exporté, accepte `silent=true`, retourne metricsA + metricsB

#### 20.2 — Régression automatique ✅
- `bot.bench.ts` : script qui lance les 3 scénarios en mode silencieux et valide :
  - Scénario 1 : Balanced(6) vs Balanced(6) × 20 → ≥ 80 % conquêtes ≤ t450, ≥ 90 % académies
  - Scénario 2 : Rusher(10) vs Rusher(1) × 10 → ≥ 80 % conquêtes ≤ t500, ≥ 70 % nv10 gagne
  - Scénario 3 : Builder(10) vs Builder(1) × 10 → ≥ 80 % conquêtes ≤ t500, ≥ 70 % nv10 gagne
- Affiche médiane, écart-type, min/max des ticks de conquête
- `process.exit(1)` si un seuil échoue — utilisable en CI

#### 20.3 — Duel asymétrique de validation ✅
- Scénarios 2 et 3 validés : même style, niveaux opposés (10 vs 1)
- Level-10 gagne 100 % des duels avec les optimisations actuelles
- Implémenté via : `levelProdMultiplier()` (prod. normalisée sur nv6), `resourceWasteRate`, `scoreNoiseEpsilon`
- Phase 18.2 : guard 1.5× supprimé (causait des deadlocks), remplacé par boost ×1.3 uniquement

---

### Phase 21 — Coordination multi-villages ✅
> Le bot ne gère qu'un village à la fois — lui donner une vision globale de sa "tribu"

#### 21.1 — Snapshot agrégé multi-villages ✅
- Ajouter dans `GameSnapshot` : `alliedVillages: { id, offensivePower, defensivePower, phase }[]`
- `BotBrain` reçoit la liste des villages amis contrôlés par le même bot (même `BotService`)
- Permet de savoir si un allié peut couvrir la défense avant de partir attaquer

#### 21.2 — Transfert de troupes entre villages ✅
- Nouvelle action `scoreTransfer(snap)` : envoyer des troupes d'un village fort vers un village sous pression
- Trigger : village allié avec loyauté < 40 ET village courant avec surplus offensif (> 2× le seuil d'attaque)
- Guard : ne pas transférer si le village courant lui-même est attaqué

#### 21.3 — Attaque coordonnée simultanée ✅
- En late phase, si plusieurs villages alliés ont des nobles : déclencher les envois le même tick
- Réduit le temps entre les frappes de noble → conquest plus rapide
- Nécessite un signal partagé entre `BotBrain` instances (via `BotService`)

---

### Phase 22 — Adaptation comportementale dynamique ✅
> Le bot a un style fixé à la création — lui permettre de pivoter selon l'état de la partie

#### 22.1 — Détection de menace dominante ✅
- Après tick 100 : si `incomingAttacks.length > 3` sur les 20 derniers ticks → basculer temporairement vers `defender`
- Retour au style initial après 50 ticks sans attaque entrante
- Evite que le rusher continue d'attaquer alors qu'il est sous siège permanent

#### 22.2 — Opportunisme en fin de partie ✅
- Si un joueur humain a loyauté < 30 (visible au scout) ET le bot n'a pas de noble en transit → prioriser ce joueur
- Surpasse le `conquestTargetId` courant si l'opportunité est meilleure
- Guard : ne changer de cible que si la nouvelle cible est accessible (offPow >= 60 % de sa défense)

#### 22.3 — Mémoire des échecs ✅
- Étendre `conquestFailStreak` : si une cible résiste 3 fois → l'ajouter à une `blacklist` (TTL 100 ticks)
- `scoreAttack` retourne -1 pour les cibles blacklistées (sauf si c'est la seule cible)
- Affine la sélection de cible au fil du temps sans mémoire infinie

---

### Phase 23 — Intégration serveur réelle ✅
> Passer de la simulation isolée au bot jouant dans une vraie partie

#### 23.1 — Smoke test en partie réelle ✅
- Lancer une partie avec 2 bots (niveau 5 et niveau 8) sur un serveur de dev
- Vérifier que `BotService` démarre bien, que les actions sont exécutées sans erreur Prisma
- Critère : les 2 bots atteignent la phase `late` et envoient au moins un noble dans les 6 heures de jeu

#### 23.2 — Observabilité en production ✅
- Ajouter un endpoint admin `GET /admin/bots/status` : liste les bots actifs, leur phase, leur dernière action
- `BotLogger` persiste les 50 dernières entrées en mémoire par bot (accessible via l'endpoint)
- Permet de diagnostiquer un bot bloqué sans ouvrir les logs serveur

#### 23.3 — Résilience aux erreurs Prisma ✅
- Wrapper `try/catch` dans `BotBrain.executeAction()` avec retry × 2 sur erreur transiente
- Si une action échoue 3 fois → logger l'erreur, passer à `idle`, ne pas crasher le bot
- Ajouter un compteur `consecutiveErrors` : si > 10 → `BotService.stopBot()` + alerte admin

---

## Ordre d'exécution recommandé

```
Phase 0  →  Phase 1  →  Phase 2  →  Phase 3
(schéma)    (profils)   (snapshot)  (FSM)
                 ↓
Phase 4  →  Phase 5  →  Phase 6
(scores)    (BotBrain)  (BotService + respawn)
                 ↓
Phase 7  →  Phase 8  →  Phase 9
(register)  (socket)    (tests)
                 ↓
Phase 10 →  Phase 11 →  Phase 12
(tactique)  (espionnage) (défense)
                 ↓
Phase 13 →  Phase 14 →  Phase 15
(économie)  (conquête)  (calibrage)
                 ↓
Phase 16 →  Phase 17 →  Phase 18
(batch)     (résilience) (conquête intel)
                 ↓
Phase 19 →  Phase 20 →  Phase 21
(endgame)   (validation) (multi-villages)
                 ↓
Phase 22 →  Phase 23
(adaptation) (intégration réelle)
```

---

## Contraintes critiques

| Contrainte | Détail |
|-----------|--------|
| **Troupes en transit** | `troopsInTransit` = `ActiveAttack` status `traveling`. Jamais comptées dans la défense. |
| **2 slots construction** | `buildQueueCount >= 2` → aucun build ne peut être scoré |
| **File recrutement** | Une file par bâtiment (`barracks`, `stable`, `garage`). Vérifier avant de scorer. |
| **Rally point** | Sans `rally_point L1`, toutes les attaques sont bloquées. Scorer très fort en early. |
| **Noble** | Coût 40k/50k/50k. Ne scorer qu'en phase `late` si les ressources sont disponibles. |
| **Loyauté < 30** | Forcer phase `late` (défense prioritaire) si `loyaltyPoints < 30`. |
| **Boucle indestructible** | `try/catch` global dans `start()`. Logger + `sleep(2000)`. Ne jamais crasher. |
| **Isolation** | Chaque `BotBrain` est indépendant. Pas d'état partagé entre instances. |

---

## Phase 24 — Noble Train ✅

> Mécanisme de conquête réel : cleaner + nobles en rafale. Implémenté et validé en simulation truel (500 ticks, 3 bots).

**24.1 ✅ — Action `noble_train` dans ScoredAction**
- `cleanerUnits` (80 % des offensifs) part en premier, arrive à T+TRAVEL_TICKS
- Nobles décalés : noble i arrive à T+TRAVEL_TICKS+1+i
- Conquêtes simulées : Alpha 5, Gamma 7 en 500 ticks

**24.2 ✅ — Suppression de `saveForConquest`**
- Les cibles sont toujours visibles ; `scoreNobleTrain` (8.0–10.0) prend la priorité automatiquement

**24.3 ✅ — Noble recruit jusqu'à 5 (cap relevé de 2→5)**
- Urgence décroissante : `3.5 × (1 - n × 0.15)` — force à accumuler avant d'envoyer

**Corrections associées**
- Seuil `offensivePower` académie abaissé : 1500 → 400 (10 axemen suffisent)
- `conquestTarget` désigné dès l'entrée en phase late (pas seulement quand on a des nobles)

---

## Phase 25 — Focus cible ✅

> Un vrai joueur TW choisit UN village à tuer et ne lâche pas.

**25.1 ✅** — `consecutiveLossesByTarget: Map<string, number>` dans VillageState — suivi des défaites par cible
**25.2 ✅** — Bonus ×1.5 sur `scoreAttack` pour toute attaque vers `conquestTargetId` (remplace `prepBoost × 1.3`)
**25.3 ✅** — Switch de cible après ≥3 défaites consécutives : redirige vers l'adversaire le plus faible restant — `TARGET_SWITCH` loggué

---

## Phase 26 — Cleaner efficace ✅

> Le noble arrive sur un village vidé — pas sur 500 défenseurs.

**26.1** — Vérifier `estimatedDefense < 0.2 × cleanerPow` avant d'envoyer un noble_train
**26.2** — Si défense trop forte : envoyer cleaner seul (attaque normale), puis noble_train au tick suivant
**26.3** — `scoutMemory` : mettre à jour l'estimation défensive après chaque COMBAT_WIN/LOSS

---

## Phase 27 — Farming agressif ✅

> Ressources constantes = armée constante = conquêtes possibles.

**27.1** — Score × 2.0 sur villages abandonnés (type: 'barbarian')
**27.2** — Cooldown adaptatif : victoire → 3 ticks, défaite → 15 ticks
**27.3** — `scoreRecruit` : reconstruire l'armée en priorité après une défaite lourde (troopsLost > 10)

---

## Phase 28 — Gestion ressources ⬜

> Plus de caps à 10000/10000/10000 — fermes et entrepôts.

**28.1** — `scoreBuild(farm)` = 15.0 quand une ressource > 90 % du maxStorage
**28.2** — Style rusher : boost × 1.5 sur `iron_mine`, builder : mines équilibrées, defender : bois+pierre
**28.3** — Threshold académie basé sur proportion du maxStorage réel (pas valeur fixe)

---

## Phase 29 — Réponse défensive ⬜

> Sauver ses nobles et ses troupes avant l'impact.

**29.1** — Rappel automatique si attaque arrive dans ≤ TRAVEL_TICKS et que l'armée est en déplacement
**29.2** — `build(wall)` × 2.0 si attaque entrante détectée
**29.3** — Noble à la maison + attaque imminente → l'envoyer en "fausse attaque" pour le sauver

---

## Phase 30 — Validation finale ⬜

**30.1** — Régression : ≥1 conquête par bot nv8+ en 500 ticks (critère automatisé)
**30.2** — Scénario "humain parfait" dans bot.truel.ts (4e agent avec stratégie fixe optimale)
**30.3** — Calibration par niveau : nv1–4 = aucune conquête, nv5–7 = 1 conquête/1000 ticks, nv8–10 = 1/500
