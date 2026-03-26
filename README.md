# MMORTS Persistant Mobile

Un jeu de stratégie en temps réel massivement multijoueur (MMORTS) persistant, inspiré par la mécanique de *Tribal Wars*, conçu avec une architecture moderne en monorepo.

## 🚀 Stack Technique

- **Langages :** TypeScript (Fullstack) & Dart (Mobile)
- **Monorepo :** [pnpm](https://pnpm.io/) avec [Turborepo](https://turbo.build/)
- **Backend :** [Node.js](https://nodejs.org/) + [Fastify](https://www.fastify.io/)
- **Base de données & Cache :** [PostgreSQL](https://www.postgresql.org/) (Prisma ORM) & [Redis](https://redis.io/)
- **Files d'attente (Queues) :** [BullMQ](https://docs.bullmq.io/) pour la gestion des événements asynchrones (ticks, combats, constructions)
- **Mobile :** [Flutter](https://flutter.dev/) (Architecture BLoC, GoRouter, Dio, Hive, Drift)
- **Partage de code :** Schémas [Zod](https://zod.dev/) partagés et formules mathématiques pures
- **Infrastructure :** Docker Compose, Kubernetes, Terraform

## 🏗️ Structure du Projet

Le projet est divisé en trois packages principaux :

### 1. `packages/shared` (Le Cœur Logique)
Contient la "source de vérité" unique pour le serveur et le client.
- **Game Data :** Définitions JSON des bâtiments, unités et recherches.
- **Schemas :** Validations Zod converties en types TS et DTOs Dart.
- **Formulas :** Logique mathématique pure (calcul des coûts, temps de construction, résolution de combats, moral, loyauté).

### 2. `packages/server` (API & Game Engine)
- **Fastify API :** Points d'entrée sécurisés par JWT pour les actions des joueurs.
- **Engine :** Implémentation d'un système ECS (Entity-Component-System) pour la modularité des entités de jeu.
- **Workers :** Processus dédiés consommant les files BullMQ pour traiter les combats, les fins de construction et la production de ressources en arrière-plan.
- **Real-time :** Communication bidirectionnelle via Socket.io pour les mises à jour instantanées.

### 3. `packages/mobile` (Application Flutter)
- **State Management :** Utilisation intensive du pattern BLoC pour une séparation claire UI/Logique.
- **Local Storage :** 
    - **Hive :** Cache rapide pour l'état actuel du village et les ressources.
    - **Drift (SQLite) :** Persistance des rapports de combat et notifications pour une consultation hors-ligne.
- **Widgets Dynamiques :** Gestion des timers de construction et de mouvements de troupes en temps réel.

## 🎮 Fonctionnalités Clés

- **Gestion Multi-Village :** Switcher de village fluide et synchronisation globale des ressources.
- **Système de Combat TW-Style :** Inclut le moral, le bonus de mur, les béliers pour la destruction des remparts et les catapultes pour les bâtiments.
- **Loyauté & Conquête :** Mécanique de Noble permettant de réduire la loyauté ennemie et de conquérir des villages.
- **Économie Persistante :** Production de ressources basée sur le temps écoulé, même hors-ligne.
- **Espionnage :** Rapports de reconnaissance par paliers (tiers) selon le nombre de survivants.

## 🛠️ Installation & Développement

### Prérequis
- Node.js (v18+)
- Flutter (v3.x)
- pnpm (`npm install -g pnpm`)
- Docker & Docker Compose

### Lancement rapide

1. **Installer les dépendances :**
   ```bash
   pnpm install
   ```

2. **Démarrer l'infrastructure (DB & Redis) :**
   ```bash
   docker-compose up -d
   ```

3. **Initialiser la base de données :**
   ```bash
   cd packages/server
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

4. **Lancer le projet en mode développement :**
   ```bash
   pnpm dev
   ```

## 🗺️ Roadmap

- [x] **Phase 1 :** Fondations multi-village (Backend & Mobile Switcher)
- [x] **Phase 2 :** Loyauté & Conquête (Noble worker, trigger de conquête)
- [ ] **Phase 3 :** Support & Transfert de troupes (Garnisons alliées)
- [ ] **Phase 4 :** Carte du Monde enrichie (Visibilité selon espionnage)
- [ ] **Phase 5 :** Système d'Alliance et Diplomatie

## 📐 Architecture de Données (Exemple : Formule de coût)

Le coût des bâtiments est calculé de manière exponentielle pour assurer un équilibrage de progression :
```typescript
// Formule partagée (shared/formulas/building.formulas.ts)
const multiplier = Math.pow(definition.baseStats.costMultiplier, level - 1);
const cost = definition.baseStats.baseCost.wood * multiplier;
```

## 📜 Licence
Projet privé - Tous droits réservés.