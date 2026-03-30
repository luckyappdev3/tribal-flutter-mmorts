// ─────────────────────────────────────────────────────────────
// game.service.ts — Phase 8 : Lobby & création de partie
// Crée une Game en statut 'lobby', puis au start :
//   - place le village du joueur (position aléatoire, Phase 9 améliorera)
//   - spawne les bots via BotService
//   - passe le statut à 'running'
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import { BotService }   from '../../bot/bot.service';

const MAP_SIZE = 41; // 0–40

const PLAYER_STARTER_BUILDINGS = [
  { buildingId: 'headquarters', level: 1 },
  { buildingId: 'timber_camp',  level: 1 },
  { buildingId: 'quarry',       level: 1 },
  { buildingId: 'iron_mine',    level: 1 },
  { buildingId: 'warehouse',    level: 1 },
  { buildingId: 'barracks',     level: 1 },
];

export class GameService {
  constructor(
    private readonly prisma:      PrismaClient,
    private readonly botService:  BotService,
  ) {}

  // ── Crée une partie en statut 'lobby' ─────────────────────

  async createGame(playerId: string, botCount: number, botLevel: number, gameSpeed: number) {
    // Annuler toute partie précédente en lobby (évite les doublons)
    await this.prisma.game.updateMany({
      where:  { playerId, status: 'lobby' },
      data:   { status: 'finished' },
    });

    return this.prisma.game.create({
      data: { playerId, botCount, botLevel, gameSpeed },
    });
  }

  // ── Démarre la partie : génère les villages et lance les bots ─

  async startGame(gameId: string, playerId: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game)                        throw new Error('Partie introuvable');
    if (game.playerId !== playerId)   throw new Error('Non autorisé');
    if (game.status === 'finished')   throw new Error('Partie terminée');

    // Déjà démarrée → retourner le village existant
    if (game.status === 'running') {
      const existing = await this.prisma.village.findFirst({
        where:  { playerId, gameId },
        select: { id: true, x: true, y: true },
      });
      if (existing) return { villageId: existing.id, villageX: existing.x, villageY: existing.y };
    }

    // Trouver une position libre pour le joueur (scoped à cette game)
    const { x, y } = await this._findFreePosition(gameId);

    // Créer le village du joueur lié à cette partie
    const village = await this.prisma.village.create({
      data: {
        name:     'Mon Village',
        x,
        y,
        playerId,
        gameId,
        buildings: { create: PLAYER_STARTER_BUILDINGS },
      },
      select: { id: true, x: true, y: true },
    });

    // Mettre à jour le gameSpeed du monde pour les workers existants
    await this.prisma.gameWorld.updateMany({
      data: { gameSpeed: game.gameSpeed },
    });

    // Spawner les bots (non-bloquant)
    this.botService
      .spawnBotsForPlayer(playerId, game.botLevel, game.botCount, gameId)
      .catch(err => console.error('[GameService] Erreur spawn bots :', err));

    // Créer 200 villages abandonnés pour cette game (non-bloquant)
    // Importer le service ici pour éviter la dépendance circulaire
    const { AbandonedVillageService } = await import('../abandoned/abandoned.service');
    const abandonedService = new AbandonedVillageService(this.prisma);
    console.log(`[GameService] Lancement création villages abandonnés pour game ${gameId.slice(-6)}...`);
    abandonedService
      .seedAbandonedForGame(gameId)
      .then(() => {
        console.log(`[GameService] ✅ Création villages abandonnés terminée pour game ${gameId.slice(-6)}`);
      })
      .catch(err => console.error('[GameService] ❌ Erreur création villages abandonnés :', err.message));

    // Passer la partie en 'running'
    await this.prisma.game.update({
      where: { id: gameId },
      data:  { status: 'running' },
    });

    console.log(`[GameService] Partie ${gameId.slice(-6)} démarrée — joueur (${x},${y}), ${game.botCount} bots niv.${game.botLevel} ×${game.gameSpeed}`);

    return { villageId: village.id, villageX: village.x, villageY: village.y };
  }

  // ── Récupère l'état d'une partie ──────────────────────────

  async getGame(gameId: string, playerId: string) {
    const game = await this.prisma.game.findUnique({
      where:   { id: gameId },
      include: { villages: { select: { id: true, x: true, y: true, playerId: true, isBot: true } } },
    });
    if (!game)                      throw new Error('Partie introuvable');
    if (game.playerId !== playerId) throw new Error('Non autorisé');
    return game;
  }

  // ── Placer les villages de façon équidistante (Phase 9) ──────

  private async _findFreePosition(gameId?: string): Promise<{ x: number; y: number }> {
    // Seulement les villages de cette game (ou globaux si pas de gameId)
    const taken = new Set(
      (await this.prisma.village.findMany({
        where:  gameId ? { gameId } : {},
        select: { x: true, y: true },
      })).map(v => `${v.x},${v.y}`),
    );

    // Grille + jitter pour distribuer les joueurs
    const cellSize = 8;
    const cols = Math.ceil(MAP_SIZE / cellSize);
    const rows = Math.ceil(MAP_SIZE / cellSize);
    const positions: Array<{ x: number; y: number }> = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const basX = c * cellSize + cellSize / 2;
        const basY = r * cellSize + cellSize / 2;
        const jitterX = basX + (Math.random() - 0.5) * 4;
        const jitterY = basY + (Math.random() - 0.5) * 4;
        const x = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor(jitterX)));
        const y = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor(jitterY)));
        if (!taken.has(`${x},${y}`)) positions.push({ x, y });
      }
    }

    // Fallback : position aléatoire si la grille est saturée
    if (positions.length === 0) {
      let attempts = 0;
      while (attempts < 200) {
        const x = Math.floor(Math.random() * MAP_SIZE);
        const y = Math.floor(Math.random() * MAP_SIZE);
        if (!taken.has(`${x},${y}`)) return { x, y };
        attempts++;
      }
      throw new Error('Carte pleine');
    }
    const pos = positions[Math.floor(Math.random() * positions.length)];
    taken.add(`${pos.x},${pos.y}`);
    return pos;
  }
}
