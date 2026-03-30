// ─────────────────────────────────────────────────────────────
// bot.service.ts — Gestion du cycle de vie des bots
// Spawn, stop, respawn. Une instance par village bot.
// ─────────────────────────────────────────────────────────────

import { PrismaClient }        from '@prisma/client';
import { randomUUID }          from 'crypto';
import { GameDataRegistry }    from '../engine/game-data-registry';
import { ConstructionService } from '../modules/construction/construction.service';
import { TroopsService }       from '../modules/troops/troops.service';
import { CombatService }       from '../modules/combat/combat.service';
import { BotBrain }            from './bot.brain';
import { ICoordinationHub, AlliedVillageInfo } from './bot.types';

// Bâtiments de départ d'un village bot
// QG niveau 5 + forge niveau 2 : débloque les axemen dès le départ
const STARTER_BUILDINGS = [
  { buildingId: 'headquarters', level: 5 },
  { buildingId: 'timber_camp',  level: 1 },
  { buildingId: 'quarry',       level: 1 },
  { buildingId: 'iron_mine',    level: 1 },
  { buildingId: 'warehouse',    level: 1 },
  { buildingId: 'barracks',     level: 1 },
  { buildingId: 'smith',        level: 2 },
  { buildingId: 'rally_point',  level: 1 },
  { buildingId: 'stable',       level: 1 },  // débloque les éclaireurs dès le départ
];

// Taille de la carte (0 → MAP_SIZE - 1)
const MAP_SIZE = 41;

// Distance min/max du village joueur pour le spawn du bot
const SPAWN_DIST_MIN = 5;
const SPAWN_DIST_MAX = 15;

// ── Hub de coordination pour les attaques nobles groupées (21.3) ─

class CoordinationHub implements ICoordinationHub {
  // Map<botPlayerId, Map<villageId, conquestTarget>>
  private ready     = new Map<string, Map<string, string>>();
  // Villages ayant reçu le signal "go"
  private goSignals = new Map<string, boolean>();

  register(botPlayerId: string, villageId: string, conquestTarget: string): void {
    if (!this.ready.has(botPlayerId)) this.ready.set(botPlayerId, new Map());
    const group = this.ready.get(botPlayerId)!;
    group.set(villageId, conquestTarget);

    // Regrouper par cible : si 2+ villages visent la même → déclencher
    const byTarget = new Map<string, string[]>();
    for (const [vid, target] of group) {
      if (!byTarget.has(target)) byTarget.set(target, []);
      byTarget.get(target)!.push(vid);
    }
    for (const [, vids] of byTarget) {
      if (vids.length >= 2) {
        for (const vid of vids) {
          this.goSignals.set(vid, true);
          group.delete(vid);
        }
      }
    }
  }

  shouldFire(villageId: string): boolean {
    return this.goSignals.get(villageId) ?? false;
  }

  consume(villageId: string): void {
    this.goSignals.delete(villageId);
  }

  deregister(villageId: string, botPlayerId: string): void {
    this.goSignals.delete(villageId);
    this.ready.get(botPlayerId)?.delete(villageId);
  }
}

// ─────────────────────────────────────────────────────────────

export class BotService {
  // Clé = villageId du bot
  private bots = new Map<string, BotBrain>();
  private botPlayerIdMap = new Map<string, string>(); // villageId → botPlayerId
  private coordHub       = new CoordinationHub();

  constructor(
    private readonly prisma:    PrismaClient,
    private readonly gameData:  GameDataRegistry,
    private readonly services: {
      construction: ConstructionService;
      troops:       TroopsService;
      combat:       CombatService;
    },
  ) {}

  private makeGetAllies(villageId: string, botPlayerId: string): () => AlliedVillageInfo[] {
    return () => {
      const allies: AlliedVillageInfo[] = [];
      for (const [vid, brain] of this.bots) {
        if (vid === villageId) continue;
        if (this.botPlayerIdMap.get(vid) !== botPlayerId) continue;
        allies.push({
          id:             vid,
          offensivePower: brain.currentOffensivePower,
          defensivePower: brain.currentDefensivePower,
          phase:          brain.currentPhase,
          loyaltyPoints:  brain.currentLoyaltyPoints,
        });
      }
      return allies;
    };
  }

  // ── Reprendre les bots existants en DB au démarrage ──────

  async resumeAllBots(): Promise<void> {
    const botVillages = await this.prisma.village.findMany({
      where: { 
        isBot: true,
        player: { isBot: true } // Assure-toi que le joueur lié est aussi marqué bot
      },
      select: { id: true, botDifficulty: true, botPlayerId: true },
    });

    let resumed = 0;
    for (const v of botVillages) {
      if (this.bots.has(v.id)) continue;
      const level    = v.botDifficulty ?? 5;
      const bpId     = v.botPlayerId ?? v.id;
      this.botPlayerIdMap.set(v.id, bpId);
      const getAllies = this.makeGetAllies(v.id, bpId);
      const brain     = new BotBrain(v.id, level, bpId, getAllies, this.coordHub, this.prisma, this.gameData, this.services);
      this.bots.set(v.id, brain);
      brain.start().catch(err =>
        console.error(`[BotService] BotBrain ${v.id.slice(-6)} crash au resume :`, err),
      );
      resumed++;
    }

    if (resumed > 0) console.log(`[BotService] ${resumed} bot(s) repris au démarrage.`);
  }

  // ── Spawner 1 bot autour d'un joueur ─────────────────────

  async spawnBotsForPlayer(
    playerId:     string,
    level:        number,
    count:        number = 1,
    gameId?:      string,   // Phase 8 : scope les villages bot à la partie
  ): Promise<void> {
    // Récupérer le village du joueur pour le centrer
    const playerVillage = await this.prisma.village.findFirst({
      where:  { playerId, isBot: false, ...(gameId ? { gameId } : {}) },
      select: { x: true, y: true, worldId: true },
    });
    if (!playerVillage) {
      console.warn(`[BotService] Village joueur introuvable pour playerId=${playerId}`);
      return;
    }

    // Trouver les positions déjà occupées sur la carte
    const takenVillages = await this.prisma.village.findMany({
      select: { x: true, y: true },
    });
    const taken = new Set(takenVillages.map(v => `${v.x},${v.y}`));

    let spawned = 0;
    let attempts = 0;
    const maxAttempts = 200;

    while (spawned < count && attempts < maxAttempts) {
      attempts++;

      // Position aléatoire dans l'anneau [DIST_MIN, DIST_MAX] autour du joueur
      const angle = Math.random() * 2 * Math.PI;
      const dist  = SPAWN_DIST_MIN + Math.random() * (SPAWN_DIST_MAX - SPAWN_DIST_MIN);
      const x = Math.round(Math.max(0, Math.min(MAP_SIZE - 1, playerVillage.x + Math.cos(angle) * dist)));
      const y = Math.round(Math.max(0, Math.min(MAP_SIZE - 1, playerVillage.y + Math.sin(angle) * dist)));

      if (taken.has(`${x},${y}`)) continue;
      taken.add(`${x},${y}`);

      await this._spawnOneBot(x, y, playerId, level, playerVillage.worldId ?? undefined, gameId);
      spawned++;
    }

    if (spawned < count) {
      console.warn(`[BotService] Seulement ${spawned}/${count} bots spawnés (carte trop pleine ?)`);
    }
  }

  // ── Appelé quand un bot conquiert un village joueur ──────────
  // Démarre un nouveau BotBrain pour le village conquis

  async onBotConquest(attackerVillageId: string, conqueredVillageId: string): Promise<void> {
    const attacker = await this.prisma.village.findUnique({
      where:  { id: attackerVillageId },
      select: { botDifficulty: true, botPlayerId: true },
    });
    if (!attacker?.botDifficulty) return; // pas un bot, ou sans niveau configuré

    const level = attacker.botDifficulty;

    // S'assurer qu'aucun brain ne tourne déjà pour ce village
    this.stopBot(conqueredVillageId);

    const bpId     = attacker.botPlayerId ?? conqueredVillageId;
    this.botPlayerIdMap.set(conqueredVillageId, bpId);
    const getAllies = this.makeGetAllies(conqueredVillageId, bpId);
    const brain = new BotBrain(
      conqueredVillageId,
      level,
      bpId,
      getAllies,
      this.coordHub,
      this.prisma,
      this.gameData,
      this.services,
    );
    this.bots.set(conqueredVillageId, brain);
    brain.start().catch(err =>
      console.error(`[BotService] BotBrain ${conqueredVillageId.slice(-6)} crash post-conquête :`, err),
    );

    console.log(
      `[BotService] Bot conquérant → nouveau brain village=${conqueredVillageId.slice(-6)} niveau=${level}`,
    );
  }

  // ── Appelé quand un village bot est conquis ───────────────

  async onBotConquered(botVillageId: string): Promise<void> {
    const botVillage = await this.prisma.village.findUnique({
      where:  { id: botVillageId },
      select: { botDifficulty: true, botPlayerId: true, worldId: true },
    });
    if (!botVillage?.botPlayerId || !botVillage.botDifficulty) return;

    // Stopper l'ancien BotBrain
    this.stopBot(botVillageId);

    console.log(
      `[BotService] Village bot ${botVillageId.slice(-6)} conquis — respawn niveau ${botVillage.botDifficulty}`,
    );

    // Respawner 1 bot au même niveau, lié au même joueur
    await this.spawnBotsForPlayer(
      botVillage.botPlayerId,
      botVillage.botDifficulty,
      1,
    );
  }

  // ── Stopper un bot ────────────────────────────────────────

  stopBot(villageId: string): void {
    const brain = this.bots.get(villageId);
    if (brain) {
      brain.stop();
      const bpId = this.botPlayerIdMap.get(villageId);
      if (bpId) this.coordHub.deregister(villageId, bpId);
      this.botPlayerIdMap.delete(villageId);
      this.bots.delete(villageId);
    }
  }

  stopAll(): void {
    for (const [id, brain] of this.bots) {
      brain.stop();
      console.log(`[BotService] Bot ${id.slice(-6)} stoppé.`);
    }
    this.bots.clear();
  }

  // ── État des bots actifs ──────────────────────────────────

  getStatus(villageId: string) {
    const brain = this.bots.get(villageId);
    if (!brain) return null;
    return { phase: brain.currentPhase, isRunning: brain.running };
  }

  getAllStatuses() {
    return Array.from(this.bots.entries()).map(([villageId, brain]) => ({
      villageId,
      phase:     brain.currentPhase,
      isRunning: brain.running,
      logFile:   brain.logger.path,
    }));
  }

  // 23.2 — Retourne les logs récents d'un bot pour l'endpoint admin
  getBotLogs(villageId: string): string[] | null {
    const brain = this.bots.get(villageId);
    return brain ? brain.logger.getRecentLogs() : null;
  }

  // ── Privé : créer un village bot en BDD + démarrer son brain

  private async _spawnOneBot(
    x:        number,
    y:        number,
    botPlayerId: string,
    level:    number,
    worldId?: string,
    gameId?:  string,
  ): Promise<void> {
    const uid = randomUUID().slice(0, 8);

    // Créer un Player fictif pour ce bot
    const botPlayer = await this.prisma.player.create({
      data: {
        username: `Bot_${uid}`,
        email:    `bot_${uid}@bot.internal`,
        password: randomUUID(), // jamais utilisé pour login
        isBot:    true,
      },
    });

    // Créer le village bot
    const botVillage = await this.prisma.village.create({
      data: {
        name:         `Village Bot ${uid}`,
        x,
        y,
        playerId:     botPlayer.id,
        isBot:        true,
        botDifficulty: level,
        botPlayerId,
        ...(worldId ? { worldId } : {}),
        ...(gameId  ? { gameId }  : {}),
        buildings: { create: STARTER_BUILDINGS },
      },
      select: { id: true },
    });

    // Instancier et démarrer le BotBrain
    this.botPlayerIdMap.set(botVillage.id, botPlayerId);
    const getAllies = this.makeGetAllies(botVillage.id, botPlayerId);
    const brain = new BotBrain(
      botVillage.id,
      level,
      botPlayerId,
      getAllies,
      this.coordHub,
      this.prisma,
      this.gameData,
      this.services,
    );

    // 23.3 — Alerte admin si le bot s'arrête sur erreur critique
    brain.onCriticalError = () => {
      console.error(`[BotService] ⚠️ Bot ${botVillage.id.slice(-6)} stoppé après 10+ erreurs consécutives`);
      this.bots.delete(botVillage.id);
      this.botPlayerIdMap.delete(botVillage.id);
    };

    this.bots.set(botVillage.id, brain);

    // Démarrage non-bloquant
    brain.start().catch(err =>
      console.error(`[BotService] BotBrain ${botVillage.id.slice(-6)} crash fatal :`, err),
    );

    console.log(
      `[BotService] Bot spawné → village=${botVillage.id.slice(-6)} (${x},${y}) niveau=${level}`,
    );
  }
}
