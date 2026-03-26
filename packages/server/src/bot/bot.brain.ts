// ─────────────────────────────────────────────────────────────
// bot.brain.ts — Classe BotBrain
// Boucle principale du bot : tick toutes les N ms,
// évalue la meilleure action, l'exécute via les services.
// ─────────────────────────────────────────────────────────────

import { PrismaClient }           from '@prisma/client';
import { GameDataRegistry }       from '../engine/game-data-registry';
import { ConstructionService }    from '../modules/construction/construction.service';
import { TroopsService }          from '../modules/troops/troops.service';
import { CombatService }          from '../modules/combat/combat.service';

import { buildProfile, buildStyleWeights }  from './bot.profile';
import { getSnapshot }                       from './bot.snapshot';
import { evaluatePhase }                     from './bot.fsm';
import { computeAllScores }                  from './bot.scores';
import { BotLogger }                         from './bot.logger';
import {
  Phase,
  GameSnapshot,
  ScoredAction,
  DifficultyProfile,
  BotStyle,
  PhaseWeights,
  ICoordinationHub,
  AlliedVillageInfo,
} from './bot.types';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────

// Styles comportementaux disponibles pour le tirage aléatoire (15.3)
const BOT_STYLES: BotStyle[] = ['rusher', 'builder', 'balanced'];

export class BotBrain {
  private phase:          Phase = 'early';
  private profile:        DifficultyProfile;
  private isRunning       = false;
  readonly logger:        BotLogger;
  // Cooldown anti-spam : timestamp (ms réel) de la dernière attaque par cible
  private lastAttackTime  = new Map<string, number>();
  // Mémoire d'espionnage : timestamp (ms réel) du dernier scout envoyé par cible
  private scoutMemory     = new Map<string, number>();
  // Historique des ressources pour détection du bottleneck (13.1)
  private resourceHistory: { wood: number; stone: number; iron: number }[] = [];
  // Cible de conquête (14.2) : village joueur visé par les nobles
  private conquestTarget: string | null = null;
  // 15.3 — Style comportemental tiré à la création
  private readonly style:        BotStyle;
  private readonly styleWeights: Record<string, PhaseWeights>;
  // 15.2b — Anti-frustration : pause si le joueur a subi de lourdes pertes
  private pauseUntil:         number | null = null;
  private lastDefensivePower: number        = 0;
  // 17.3 — Pause après pillage : bloquer les attaques si on vient d'être pillé
  private lastResourceTotal:  number        = 0;
  private raidPauseTicks:     number        = 0; // ticks restants de pause anti-pillage
  // 18.1 — Conquête intelligente : compteur de ticks depuis le dernier changement de cible
  private conquestTicksSinceEval: number    = 0;
  private conquestFailStreak:     number    = 0; // 18.3 : échecs nobles consécutifs

  // 21.1 — Données alliées exposées pour BotService.getAllies()
  private lastOffensivePower: number = 0;
  private lastDefPower:       number = 0;
  private lastLoyaltyPoints:  number = 100;

  // 22.1 — Détection de menace dominante
  private tickCount:               number    = 0;
  private incomingAttacksHistory:  boolean[] = []; // true = >3 attaques ce tick
  private isInDefenderMode:        boolean   = false;
  private consecutiveQuietTicks:   number    = 0;
  private readonly defenderWeights: Record<string, PhaseWeights>;

  // 22.2 — Mémoire de loyauté des cibles (issue des scouts)
  private scoutLoyaltyMemory = new Map<string, number>(); // villageId → loyaltyPoints

  // 22.3 — Blacklist de cibles de conquête (TTL 100 ticks)
  private conquestBlacklist = new Map<string, number>(); // villageId → tick de blacklist

  // 23.3 — Résilience aux erreurs
  private consecutiveErrors = 0;
  onCriticalError?: () => void; // callback injecté par BotService

  constructor(
    private readonly villageId:   string,
    private readonly level:       number,         // 1–10
    private readonly botPlayerId: string,
    private readonly getAllies:   () => AlliedVillageInfo[],
    private readonly coordHub:    ICoordinationHub,
    private readonly prisma:      PrismaClient,
    private readonly gameData:  GameDataRegistry,
    private readonly services: {
      construction: ConstructionService;
      troops:       TroopsService;
      combat:       CombatService;
    },
  ) {
    this.profile        = buildProfile(level);
    this.logger         = new BotLogger(villageId);
    // 15.3 — Style tiré aléatoirement à la création
    this.style          = BOT_STYLES[Math.floor(Math.random() * BOT_STYLES.length)];
    this.styleWeights   = buildStyleWeights(this.style);
    // 22.1 — Poids du mode défensif temporaire
    this.defenderWeights = buildStyleWeights('defender');
  }

  // ── Détection du bottleneck ressource (13.1) ──────────────
  private computeBottleneck(maxStorage: number): 'wood' | 'stone' | 'iron' | null {
    if (this.resourceHistory.length < 3) return null;
    const n = this.resourceHistory.length;
    const avgW = this.resourceHistory.reduce((s, r) => s + r.wood  / maxStorage, 0) / n;
    const avgS = this.resourceHistory.reduce((s, r) => s + r.stone / maxStorage, 0) / n;
    const avgI = this.resourceHistory.reduce((s, r) => s + r.iron  / maxStorage, 0) / n;
    const min  = Math.min(avgW, avgS, avgI);
    if (min === avgW) return 'wood';
    if (min === avgS) return 'stone';
    return 'iron';
  }

  // ── Bruit artificiel ──────────────────────────────────────
  private applyNoise(score: number): number {
    const e = this.profile.scoreNoiseEpsilon;
    return score * (1 - e + Math.random() * 2 * e);
  }

  // ── Gaspillage de ressources (simule l'inattention) ───────
  private applyResourceWaste(snap: GameSnapshot): GameSnapshot {
    const w = this.profile.resourceWasteRate;
    if (w === 0) return snap;
    return {
      ...snap,
      wood:  snap.wood  * (1 - w),
      stone: snap.stone * (1 - w),
      iron:  snap.iron  * (1 - w),
    };
  }

  // ── Biais sur l'estimation du butin ───────────────────────
  private applyLootBias(snap: GameSnapshot): GameSnapshot {
    const bias = this.profile.lootEstimationBias;
    if (bias === 0) return snap;
    return {
      ...snap,
      allTargets: snap.allTargets.map(t => ({
        ...t,
        estimatedResources:
          t.estimatedResources * (1 - bias + Math.random() * 2 * bias),
      })),
    };
  }

  // ── Notification de résultat scout (22.2) ─────────────────
  notifyScoutResult(targetId: string, loyaltyPoints: number): void {
    this.scoutLoyaltyMemory.set(targetId, loyaltyPoints);
  }

  // ── Tick principal ────────────────────────────────────────
  async tick(rawSnap: GameSnapshot): Promise<ScoredAction> {
    this.tickCount++;

    // 22.1 — Mise à jour de l'historique des attaques entrantes
    this.incomingAttacksHistory.push(rawSnap.incomingAttacks.length > 3);
    if (this.incomingAttacksHistory.length > 20) this.incomingAttacksHistory.shift();

    if (this.tickCount >= 100) {
      const threatTicks = this.incomingAttacksHistory.filter(Boolean).length;
      if (!this.isInDefenderMode && threatTicks > 10) {
        this.isInDefenderMode      = true;
        this.consecutiveQuietTicks = 0;
        this.logger.logEvent(`Mode défensif activé (${threatTicks}/20 ticks sous siège)`);
      }
    }
    if (this.isInDefenderMode) {
      if (rawSnap.incomingAttacks.length === 0) {
        this.consecutiveQuietTicks++;
        if (this.consecutiveQuietTicks >= 50) {
          this.isInDefenderMode      = false;
          this.consecutiveQuietTicks = 0;
          this.logger.logEvent(`Mode défensif désactivé (50 ticks calmes)`);
        }
      } else {
        this.consecutiveQuietTicks = 0;
      }
    }

    // 1. Mise à jour de la phase
    this.phase = evaluatePhase(this.phase, rawSnap);

    // 2. Appliquer les limitations selon le profil
    let snap = this.applyResourceWaste(rawSnap);
    snap     = this.applyLootBias(snap);

    // 2c. Historique ressources + bottleneck (13.1)
    this.resourceHistory.push({ wood: snap.wood, stone: snap.stone, iron: snap.iron });
    if (this.resourceHistory.length > 10) this.resourceHistory.shift();
    snap = { ...snap, bottleneckResource: this.computeBottleneck(snap.maxStorage) };

    // 17.3 — Pause après pillage massif
    // Si les ressources totales ont chuté de >20% depuis le dernier tick → suspendre attaques 3 ticks
    const currentResourceTotal = snap.wood + snap.stone + snap.iron;
    if (
      this.lastResourceTotal > 0 &&
      currentResourceTotal < this.lastResourceTotal * 0.80
    ) {
      this.raidPauseTicks = 3;
      this.logger.logEvent(`Pause anti-pillage activée (ressources −${Math.round((1 - currentResourceTotal / this.lastResourceTotal) * 100)}%)`);
    }
    if (this.raidPauseTicks > 0) {
      this.raidPauseTicks--;
      snap = { ...snap, allTargets: [] }; // masquer les cibles pendant la pause
    }
    this.lastResourceTotal = currentResourceTotal;

    // 22.3 — Helper : vérifie si une cible est blacklistée (TTL 100 ticks)
    const isBlacklisted = (targetId: string): boolean => {
      const at = this.conquestBlacklist.get(targetId);
      return at !== undefined && this.tickCount - at < 100;
    };

    // 2d. Sélection / réévaluation de la cible de conquête (14.2 + 18.1)
    if (this.phase === 'late') {
      const playerTargets = snap.allTargets.filter(t => t.type === 'player');
      this.conquestTicksSinceEval++;

      // 22.3 — Blacklister à 3 échecs (avant l'abandon à 5)
      if (this.conquestFailStreak >= 3 && this.conquestTarget) {
        this.conquestBlacklist.set(this.conquestTarget, this.tickCount);
        this.logger.logEvent(`Blacklist conquest: ${this.conquestTarget.slice(-6)} (${this.conquestFailStreak} échecs)`);
      }

      // 18.3 — Abandonner si trop d'échecs consécutifs
      if (this.conquestFailStreak >= 5) {
        this.conquestTarget         = null;
        this.conquestFailStreak     = 0;
        this.conquestTicksSinceEval = 0;
        this.logger.logEvent('Cible de conquête abandonnée (5 échecs nobles consécutifs)');
      }

      // 22.2 — Opportunisme : prioriser un joueur avec loyauté < 30 si visible et accessible
      const noblesInTransit = snap.troopsInTransit['noble'] ?? 0;
      if (noblesInTransit === 0) {
        for (const t of playerTargets) {
          const knownLoyalty = this.scoutLoyaltyMemory.get(t.id);
          if (
            knownLoyalty !== undefined &&
            knownLoyalty < 30 &&
            !isBlacklisted(t.id) &&
            snap.offensivePower >= t.defensivePower * 0.6
          ) {
            if (t.id !== this.conquestTarget) {
              this.conquestTarget         = t.id;
              this.conquestTicksSinceEval = 0;
              this.logger.logEvent(`Opportunisme 22.2 → ${t.id.slice(-6)} (loyauté=${knownLoyalty})`);
            }
            break;
          }
        }
      }

      // 18.1 — Réévaluer la cible tous les 20 ticks ou si la cible actuelle est trop forte
      const currentTargetInfo = snap.allTargets.find(t => t.id === this.conquestTarget);
      const targetTooStrong   = currentTargetInfo
        && snap.offensivePower > 0
        && currentTargetInfo.defensivePower > snap.offensivePower * 0.6;

      // 22.3 — Exclure les cibles blacklistées de la sélection (sauf si seule cible)
      const eligibleTargets = playerTargets.filter(t => !isBlacklisted(t.id));
      const selectionPool   = eligibleTargets.length > 0 ? eligibleTargets : playerTargets;

      const shouldReevaluate =
        selectionPool.length > 0 &&
        (this.conquestTicksSinceEval >= 20 || !this.conquestTarget || targetTooStrong || isBlacklisted(this.conquestTarget ?? ''));

      if (shouldReevaluate) {
        const weakest = selectionPool.reduce((a, b) =>
          a.defensivePower <= b.defensivePower ? a : b,
        );
        if (weakest.id !== this.conquestTarget) {
          this.conquestTarget = weakest.id;
          this.logger.logEvent(`Cible de conquête → ${weakest.id.slice(-6)} (def=${weakest.defensivePower})`);
        }
        this.conquestTicksSinceEval = 0;
      }
    } else {
      this.conquestTarget         = null; // reset si on repasse en phase antérieure
      this.conquestFailStreak     = 0;
      this.conquestTicksSinceEval = 0;
    }
    snap = { ...snap, conquestTargetId: this.conquestTarget };

    // 21.1 — Peupler les villages alliés depuis BotService
    snap = { ...snap, alliedVillages: this.getAllies() };

    // 21.3 — Signaler au hub si noble prêt et cible de conquête définie
    if (this.phase === 'late' && snap.conquestTargetId && (snap.troopsHome['noble'] ?? 0) > 0) {
      this.coordHub.register(this.botPlayerId, this.villageId, snap.conquestTargetId);
    }

    // 2e. Calibrage par niveau (15.1 & 15.2)
    snap = {
      ...snap,
      // 15.1 : témérité offensive selon le niveau
      attackRecklessness:  this.profile.attackRecklessness,
      // 15.2a : pas d'attaque joueur avant 5 min réelles pour les bots niveau ≤ 3
      noEarlyPlayerAttack: this.profile.level <= 3 && snap.timeElapsedMinutes < 5,
    };

    // 15.2b : détecter une chute de puissance défensive (joueur vient de perdre des troupes)
    //         Si défense chute de >50% entre deux ticks et qu'aucune attaque n'est en cours
    //         → suspendre les attaques joueur 2 minutes pour ne pas frustrer
    if (
      this.profile.level <= 3 &&
      this.lastDefensivePower > 0 &&
      snap.defensivePower < this.lastDefensivePower * 0.5 &&
      snap.incomingAttacks.length === 0
    ) {
      this.pauseUntil = Date.now() + 2 * 60 * 1000;
      this.logger.logEvent(`Pause anti-frustration activée (${this.style}, niveau ${this.profile.level})`);
    }
    this.lastDefensivePower = snap.defensivePower;

    // 2b. Filtrer les cibles en cooldown (évite de spammer le même village)
    // Exception : pas de cooldown sur la cible de conquête (attaques nobles répétées)
    snap = {
      ...snap,
      allTargets: snap.allTargets.filter(t => {
        if (t.id === this.conquestTarget) return true; // 14.2 : toujours attaquable
        const lastTime = this.lastAttackTime.get(t.id);
        if (!lastTime) return true;
        // Cooldown = temps aller-retour + 60s de marge (en ms réels)
        const cooldownMs = (t.travelTimeSeconds * 2 + 60) * 1000;
        return Date.now() - lastTime > cooldownMs;
      }),
    };

    // 3. Ignorer les alertes défensives selon defenseIgnoreRate
    if (
      snap.incomingAttacks.length > 0 &&
      Math.random() < this.profile.defenseIgnoreRate
    ) {
      snap = { ...snap, incomingAttacks: [] };
    }

    // 4. Calculer les scores + appliquer le bruit
    // 22.1 — En mode défensif temporaire, utiliser les poids defender
    const activeWeights = this.isInDefenderMode ? this.defenderWeights : this.styleWeights;
    const candidates = computeAllScores(snap, this.phase, activeWeights).map(a => ({
      ...a,
      score: this.applyNoise(a.score),
    }));

    // 5. Sélectionner la meilleure action
    let best = candidates.reduce((a, b) => (a.score > b.score ? a : b));

    // 21.3 — Coordination : si le hub déclenche une attaque groupée, forcer l'action
    if (this.coordHub.shouldFire(this.villageId) && this.conquestTarget) {
      const coordAtk = candidates.find(
        a => a.type === 'attack' && a.targetId === this.conquestTarget,
      );
      if (coordAtk) {
        best = coordAtk;
        this.coordHub.consume(this.villageId);
        this.logger.logEvent(`Attaque coordonnée déclenchée → ${this.conquestTarget.slice(-6)}`);
      }
    }

    // 6. Logging
    const top3 = [...candidates]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    this.logger.logTick(this.level, this.phase, rawSnap, best, top3);

    // 7. Délai APM (humanisation)
    // BOT_TICK_MS=500 en test pour accélérer les observations
    const tickOverride = process.env.BOT_TICK_MS ? Number(process.env.BOT_TICK_MS) : null;
    const [min, max]   = this.profile.apmDelayRange;
    const delay        = tickOverride ?? (min + Math.random() * (max - min));
    await sleep(delay);

    // Mettre à jour les métriques exposées à BotService (21.1)
    this.lastOffensivePower = rawSnap.offensivePower;
    this.lastDefPower       = rawSnap.defensivePower;
    this.lastLoyaltyPoints  = rawSnap.loyaltyPoints;

    return best;
  }

  // ── Exécution d'une action ────────────────────────────────
  private async executeAction(action: ScoredAction): Promise<void> {
    switch (action.type) {

      case 'build':
        await this.services.construction.startUpgrade(
          this.villageId,
          action.targetId,
        );
        break;

      case 'recruit':
        await this.services.troops.startRecruit(
          this.villageId,
          action.targetId,
          action.count ?? 5,
        );
        break;

      case 'attack': {
        const units = action.units ?? {};
        if (Object.keys(units).length === 0) break;
        await this.services.combat.sendAttack(
          this.villageId,
          action.targetId,
          units,
        );
        // Enregistrer le cooldown pour cette cible (sauf cible de conquête)
        if (action.targetId !== this.conquestTarget) {
          this.lastAttackTime.set(action.targetId, Date.now());
        }
        // 18.3 — Reset du streak d'échec noble à chaque attaque de conquête envoyée
        if (action.targetId === this.conquestTarget && (action.units?.['noble'] ?? 0) > 0) {
          // Le résultat arrive plus tard ; on remet le compteur à 0 à l'envoi
          // (le service combat appellera un callback si l'attaque est perdue)
          this.conquestFailStreak = 0;
        }
        break;
      }

      case 'recall':
        await this.services.combat.recall(action.targetId, this.villageId);
        break;

      case 'transfer': {
        const units = action.units ?? {};
        if (Object.keys(units).length === 0) break;
        await (this.services.combat as any).sendSupport(
          this.villageId,
          action.targetId,
          units,
        );
        this.logger.logEvent(`Transfert → ${action.targetId.slice(-6)} (${Object.entries(units).map(([u,c]) => `${c}×${u}`).join(', ')})`);
        break;
      }

      case 'noble_train': {
        // 24.1 — Noble train : envoyer d'abord le cleaner, puis les nobles en rafale
        const cleanerUnits = action.cleanerUnits ?? {};
        const nobleUnits   = action.units ?? {};
        const cleanerTotal = Object.values(cleanerUnits).reduce((s, n) => s + n, 0);
        const noblesCount  = nobleUnits['noble'] ?? 0;

        if (cleanerTotal > 0) {
          await this.services.combat.sendAttack(this.villageId, action.targetId, cleanerUnits);
        }
        if (noblesCount > 0) {
          // Envoyer chaque noble séparément pour décaler les arrivées
          for (let i = 0; i < noblesCount; i++) {
            await this.services.combat.sendAttack(this.villageId, action.targetId, { noble: 1 });
          }
        }
        this.logger.logEvent(`Noble train → ${action.targetId.slice(-6)} cleaner=${cleanerTotal} nobles=${noblesCount}`);
        break;
      }

      case 'scout':
        await this.services.combat.sendScout(
          this.villageId,
          action.targetId,
          action.count ?? 3,
        );
        // Mémoriser l'espionnage pour enrichir les snapshots suivants
        this.scoutMemory.set(action.targetId, Date.now());
        break;

      case 'idle':
        // Rien à faire
        break;
    }
  }

  // ── Exécution avec retry × 2 (23.3) ─────────────────────
  private async executeActionSafe(action: ScoredAction): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.executeAction(action);
        this.consecutiveErrors = 0;
        return;
      } catch (error: any) {
        const msg = error?.message ?? String(error);
        if (attempt < 2) {
          this.logger.logError(`Erreur action (tentative ${attempt + 1}/3): ${msg}`);
          await sleep(500 * (attempt + 1));
        } else {
          this.consecutiveErrors++;
          this.logger.logError(`Échec définitif action (${this.consecutiveErrors} erreurs consécutives): ${msg}`);
          if (this.consecutiveErrors > 10) {
            this.logger.logError('Trop d\'erreurs consécutives — arrêt du bot');
            this.stop();
            this.onCriticalError?.();
          }
        }
      }
    }
  }

  // ── Boucle autonome ───────────────────────────────────────
  async start(): Promise<void> {
    this.isRunning = true;
    this.logger.logEvent(`Démarrage niveau=${this.level} style=${this.style}`);

    while (this.isRunning) {
      // 15.2b — Pause anti-frustration : attendre que la pause expire
      if (this.pauseUntil && Date.now() < this.pauseUntil) {
        await sleep(5000);
        continue;
      }
      this.pauseUntil = null;

      try {
        const snap = await getSnapshot(
          this.villageId,
          this.prisma,
          this.gameData,
          this.profile.visionRadius,
          this.scoutMemory,
        );

        const action = await this.tick(snap);

        if (action.type !== 'idle') {
          await this.executeActionSafe(action);
        }

      } catch (error: any) {
        this.logger.logError(error?.message ?? String(error));
        await sleep(2000);
      }
    }

    this.logger.logEvent('Arrêté.');
  }

  stop(): void {
    this.isRunning = false;
  }

  get currentOffensivePower(): number { return this.lastOffensivePower; }
  get currentDefensivePower(): number { return this.lastDefPower;       }
  get currentLoyaltyPoints():  number { return this.lastLoyaltyPoints;  }

  get currentPhase(): Phase     { return this.phase;     }
  get running():      boolean   { return this.isRunning; }
}
