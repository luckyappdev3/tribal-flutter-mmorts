# Roadmap — Noble & Multi-Village (style Tribal Wars)

> Suivi étape par étape. Cocher chaque item au fur et à mesure.

---

## Phase 1 — Fondations multi-village
> Permettre à un joueur de posséder plusieurs villages

### Backend
- [x] `loyaltyPoints Int @default(100)` déjà présent sur `Village` dans `schema.prisma`
- [x] Tous les endpoints acceptent déjà un `villageId` explicite (URL param)
- [x] Endpoint `GET /villages/my` — liste tous les villages du joueur connecté (JWT)
- [ ] Endpoint `GET /villages/:id/overview` — *(optionnel : déjà couvert par `/villages/:id` + `/buildings`)*

### Mobile
- [x] **Village switcher** : bandeau nom village en haut + bottom sheet de sélection (`GlobalTopBar`)
- [x] `GlobalResourcesCubit.switchVillage()` — met à jour Hive + recharge les ressources
- [x] `villageName` ajouté au state `GlobalResourcesState` et affiché dans la barre
- [x] `VillageApi.getMyVillages()` + `MyVillageItemDto`
- [ ] **Écran "Mes villages"** dédié *(à faire en Phase 4 avec la carte enrichie)*
- [x] Toutes les pages lisent `current_village_id` depuis Hive (déjà le cas)

---

## Phase 2 — Loyauté & Conquête
> Implémenter la mécanique noble comme dans TW

### Règles
- Loyauté initiale : **100**, max : **100**
- Régénération : **+1/heure** (divisé par `gameSpeed`)
- Chaque noble dans une attaque gagnante réduit la loyauté de **20 à 35** (aléatoire)
- Loyauté ≤ 0 → **conquest** : village change de propriétaire
- Après conquête : le noble est consommé, les autres troupes restent

### Backend
- [x] **Tick de régénération loyauté** : `setInterval` dans `main.ts`, intervalle = `3600s / gameSpeed` (18s pour ×200)
- [x] **Résolution du noble** dans `attack.worker.ts` :
  - Détection `units['noble'] > 0` + victoire
  - `loyaltyReduction = Σ random(20–35)` par noble
  - Mise à jour `village.loyaltyPoints`
  - Si `loyaltyPoints ≤ 0` → conquest
- [x] **`triggerConquest()`** inline dans la transaction :
  - `village.playerId` → attaquant
  - `village.loyaltyPoints = 100`
  - Noble(s) consommé(s) (`delete survivors['noble']`)
  - Socket event `village:conquered`
- [x] `loyaltyBefore Int?` + `loyaltyAfter Int?` ajoutés à `CombatReport`
- [x] `type 'conquest'` sur `CombatReport`
- [x] `loyaltyPoints` exposé dans `GET /api/map`

### Mobile
- [x] `loyaltyPoints` ajouté à `VillageMarker`
- [x] **Barre de loyauté** (`_LoyaltyBar`) sur la fiche village ennemi (vert > 60, orange > 30, rouge ≤ 30)
- [x] Rapport de type `conquest` : afficher loyaltyBefore → loyaltyAfter + message de conquête

---

## Phase 3 — Support & Transfert de troupes ✅
> Envoyer des troupes en renfort entre ses propres villages

### Backend
- [x] Modèle `ActiveSupport` dans `schema.prisma` (status: traveling | stationed | returning)
- [x] `SupportQueue` (BullMQ) + `SupportWorker` — arrivée → stationed, retour → troupes rendues
- [x] `POST /villages/:id/support` → envoie des troupes vers un village allié
- [x] `DELETE /villages/:id/support/:supportId` → rappel de troupes
- [x] `GET /villages/:id/supports` → liste sent/received
- [x] Troupes stationnées incluses dans la défense (`attack.worker.ts`)

### Mobile
- [x] `SupportPage` — sélection d'unités, bouton RENFORCER (vert)
- [x] Bouton RENFORCER dans `VillageInfoSheet` pour villages alliés (hors village courant)
- [x] Vue troupes : section Garnisons (reçues + envoyées) avec bouton rappel

---

## Phase 4 — Carte & Visibilité ✅
> Voir la loyauté des villages ennemis si espionnés

### Backend
- [x] `GET /map` : `loyaltyPoints` exposé uniquement si le joueur a un rapport tier ≥ 2 sur ce village (ou c'est le sien)
- [x] `isRecentlyConquered` : `true` si conquête dans les dernières 24h

### Mobile
- [x] Barre de loyauté conditionnelle (visible uniquement si `loyaltyPoints != null`)
- [x] Tous les villages du joueur affichés en amber "Moi" (pas seulement le courant)
- [x] Indicateur 👑 sur les villages récemment conquis (24h)

---

## Phase 5 — Polish & Équilibrage ✅
- [x] **Limite noble** : 1 noble max par attaque (hardcodé côté serveur + client)
- [x] **Points** : recalcul `totalPoints` attaquant + ancien défenseur après conquête (`calculateVillagePoints` × tous leurs villages)
- [x] **Notification** : alerte SnackBar si loyauté d'un village tombe sous 50 (socket `loyalty:warning` → `GlobalResourcesCubit` → `_ScaffoldWithNavBar`)
- [x] **Rapport défenseur conquis** : endpoint `GET /villages/me/combat-reports` par joueur (inclut conquêtes via `defenderPlayerId`), message "💀 Votre village a été conquis par X" dans le rapport
- [x] **Historique conquêtes** : filtre chip 👑 dans la page Rapports

---

## Phase 6 — Marché
> Permettre aux joueurs d'échanger des ressources via des marchands qui voyagent

### Règles
- Nombre de marchands = niveau du marché
- Capacité par marchand : fixe (ex : 1000 ressources)
- Voyage aller → transfert ressources + retour marchands
- Offre publique (visible par tous) ou ciblée (vers un village spécifique)

### Backend
- [ ] Modèle `TradeOffer` dans `schema.prisma`
- [ ] `TradeQueue` (BullMQ) + `TradeWorker` — arrivée → transfert + retour marchands
- [ ] `POST /villages/:id/market/offer` — créer une offre
- [ ] `GET /villages/:id/market/offers` — offres publiques + les siennes
- [ ] `POST /villages/:id/market/offers/:offerId/accept` — accepter
- [ ] `DELETE /villages/:id/market/offers/:offerId` — annuler

### Mobile
- [ ] `MarketPage` — onglet "Mes offres" + onglet "Marché public"
- [ ] Formulaire création d'offre (ressource offerte ↔ demandée)
- [ ] Accès depuis la navigation ou la page village

---

## Phase 7 — Authentification Email/Mot de passe ✅
> Déjà entièrement implémentée

### Backend ✅
- [x] `POST /auth/register` — email, password (bcrypt), username, botDifficulty → crée Player + Village de départ avec bâtiments initiaux
- [x] `POST /auth/login` — vérifie bcrypt, retourne JWT signé via `@fastify/jwt`
- [x] Middleware JWT utilisé sur tous les endpoints (villages, troupes, combat, carte, ranking)

### Mobile ✅
- [x] `LoginPage` — email + password, init SocketService, join village, route vers home
- [x] `RegisterPage` — username, email, password + picker difficulté bots (1–10)
- [x] `AuthApi` — `login()` / `register()`, sauvegarde JWT + villageId dans Hive
- [x] `LoginResponseDto` — extrait token, userId, villageId depuis la réponse

---

## Phase 8 — Lobby : Configuration de la Partie
> Le joueur configure une partie solo contre des bots avant le lancement

### Règles
- Nombre de bots : **1 à 7** (total 8 joueurs max sur une carte 40×40)
- Niveau de difficulté bot : **1 à 10** (déjà calibré dans `bot.profile.ts` — 1=débutant lent, 10=expert quasi-parfait)
- Vitesse de jeu : **×1 à ×20 000** (slider ou saisie libre, valeur entière)
- Un seul joueur humain par partie (mode solo)
- La partie est créée côté serveur avec un `gameId` unique

### Backend
- [ ] Modèle `Game` dans `schema.prisma` : `id`, `playerId`, `botCount`, `botLevel` (1–10), `gameSpeed` (1–20000), `status` (`lobby | running | finished`), `createdAt`
- [ ] Modèle `GamePlayer` : `gameId`, `playerId | null` (null = bot), `villageId`
- [ ] `POST /games` — crée une partie, valide les paramètres, retourne `gameId`
- [ ] `POST /games/:id/start` — génère la carte, place les villages, lance les `BotBrain` avec le `botLevel` choisi
- [ ] `GET /games/:id` — état courant de la partie

### Mobile
- [ ] `LobbyPage` — 3 sections :
  - Slider **Nombre de bots** (1–7)
  - Slider **Niveau des bots** (1–10) avec label descriptif (`bot.profile.ts` : 1-3 débutant, 4-7 normal, 8-10 expert)
  - Champ / slider **Vitesse** (×1 → ×20 000)
- [ ] Bouton **LANCER LA PARTIE** → `POST /games` + `POST /games/:id/start` → navigation vers la carte
- [ ] `GameCubit` — stocke `gameId`, `gameSpeed`, `botLevel`, `botCount` dans Hive

---

## Phase 9 — Génération de Carte ✅
> Le serveur génère une carte 40×40 et positionne les villages de façon équidistante

### Règles ✅
- Carte : **(0,0) à (40,40)** — 41×41 cases
- Placement équidistant : grille adaptée (cellSize 8) + jitter ±2 cases
- Garantit équité de position de départ

### Backend ✅
- [x] `_findFreePosition()` dans `game.service.ts` — Poisson disk sampling simplifié
  - Divise la carte en cellules ~8×8
  - Applique jitter aléatoire (±2) sur chaque cellule
  - Sélectionne position libre aléatoirement
- [x] Villages créés lors de `startGame()` avec placement équidistant

### Mobile ✅
- [x] `MapPage` existante utilise les villages avec leurs coordonnées

---

## Phase 10 — Intelligence Artificielle des Bots ✅ (existant)
> Système IA complet déjà implémenté dans `packages/server/src/bot/`

### Ce qui existe déjà
- [x] **`bot.brain.ts`** — boucle de décision principale, tick adaptatif, gestion erreurs
- [x] **`bot.fsm.ts`** — machine à états : `early` → `mid` → `late` (transitions conditionnelles)
- [x] **`bot.profile.ts`** — calibration niveaux 1–10 (délai APM, bruit, rayon de vision, gaspillage, témérité)
- [x] **`bot.scores.ts`** — moteur de scoring (construire, recruter, attaquer, espionner, noble, transfert)
- [x] **`bot.snapshot.ts`** — capture complète de l'état de jeu pour la prise de décision
- [x] **`bot.service.ts`** — `spawnBotsForPlayer()`, `resumeAllBots()`, `onBotConquest()`, `onBotConquered()`
- [x] **`bot.types.ts`** — `ActionType`, `BotStyle` (rusher/builder/balanced/defender), `DifficultyProfile`
- [x] **`bot.logger.ts`** + **`bot.controller.ts`** — logs par bot, endpoints admin `/admin/bots/status`

### À connecter (Phase 8 → Phase 10)
- [ ] `spawnBotsForPlayer()` appelé avec le `botLevel` et `botCount` de la `Game` créée en Phase 8
- [ ] `gameSpeed` de la `Game` transmis au tick de décision des bots (déjà supporté par `bot.service.ts`)
- [ ] Villages bots scopés au `gameId` (évite les conflits entre parties simultanées)
- [ ] Indicateur 🤖 sur les villages bots dans `VillageInfoSheet` (mobile)

---

## Phase 11 — Déroulement & Fin de Partie ✅
> Gérer le cycle de vie complet d'une partie solo

### Règles ✅
- Élimination : joueur perd son unique village → éliminé
- Victoire : joueur possède tous les villages de la partie

### Backend ✅
- [x] `GameEndService` — check après conquête si partie finie
- [x] Hook post-conquête dans `attack.worker.ts` — appel `checkGameEnd()`
- [x] Socket event `game:over` émis vers room `game:{gameId}`

### Mobile ✅
- [x] `GameOverPage` — victoire / défaite + stats (durée, gagnant)
- [x] Route `/game-over` avec paramètres extra
- [x] Listener socket `game:over` → navigation GameOverPage
- [x] Boutons REJOUER + RETOUR LOBBY

---

## Ordre d'exécution

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4 + Phase 5
(multi)     (noble)     (support)   (carte + polish)

Phase 7  →  Phase 8  →  Phase 9  →  Phase 10  →  Phase 11
(auth)      (lobby)     (génération  (IA bots)    (fin de
                         carte)                    partie)
```

---

## Schéma Prisma — changements prévus

```prisma
model Village {
  loyalty    Int  @default(100)   // ← Phase 1
}

model ActiveSupport {             // ← Phase 3
  id            String   @id @default(cuid())
  fromVillageId String
  toVillageId   String
  units         Json
  departedAt    DateTime
  arrivalAt     DateTime
  fromVillage   Village  @relation("SupportFrom", fields: [fromVillageId], references: [id])
  toVillage     Village  @relation("SupportTo",   fields: [toVillageId],   references: [id])
}

// CombatReport — Phase 2 :
// type: 'attack' | 'scout' | 'combined' | 'conquest'
// loyaltyBefore Int?
// loyaltyAfter  Int?
```

---

## État actuel du projet (base de départ)

- ✅ Système de combat (formule TW ^1.5, morale, bonus mur)
- ✅ Béliers : réduction mur pré-combat + dégâts permanents post-victoire
- ✅ Catapultes : résistance progressive, destruction itérative, règles rally_point / hiding_spot
- ✅ Espionnage (scouts, tiers 0-3, détection défenseur)
- ✅ Rapports de combat unifiés (`CombatReport` : attack / scout / combined)
- ✅ Recrutement avec file d'attente
- ✅ Gestion des ressources (production, entrepôt, pillage)
- ✅ Carte avec liste des villages
- ✅ Population bâtiments (tables TW exactes par delta)
