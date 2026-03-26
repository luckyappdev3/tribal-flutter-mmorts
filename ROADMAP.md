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

## Ordre d'exécution

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4 + Phase 5
(multi)     (noble)     (support)   (carte + polish)
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
