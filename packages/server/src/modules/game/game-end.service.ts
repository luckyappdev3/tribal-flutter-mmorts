// ─────────────────────────────────────────────────────────────
// game-end.service.ts — Phase 11 : Détection fin de partie
// Vérifie après chaque conquête si partie terminée
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

export class GameEndService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Après une conquête : vérifie si la partie est terminée
   * - Défenseur éliminé (perd son unique village)
   * - Attaquant gagne (possède tous les villages)
   */
  async checkGameEnd(
    defenderVillageId: string,
    attackerVillageId: string,
  ): Promise<{ gameId?: string; winnerId?: string } | null> {
    // Trouver la partie associée au village
    const game = await this.prisma.game.findFirst({
      where: {
        villages: { some: { id: defenderVillageId } },
        status:   'running',
      },
      include: {
        villages: { select: { id: true, playerId: true } },
        player:   { select: { id: true } },
      },
    });

    if (!game) return null; // Pas de game (MMORTS classique)

    // Compter villages par joueur dans cette partie
    const villagesByPlayer = new Map<string | null, number>();
    for (const v of game.villages) {
      const pid = v.playerId ?? 'abandoned';
      villagesByPlayer.set(pid, (villagesByPlayer.get(pid) ?? 0) + 1);
    }

    // Trouver l'attaquant
    const attacker = await this.prisma.village.findUnique({
      where: { id: attackerVillageId },
      select: { playerId: true },
    });
    const attackerPlayerId = attacker?.playerId ?? 'unknown';

    // Vérifier victoire : attaquant possède tous les villages non-abandonnés
    const totalVillages = game.villages.filter(v => v.playerId !== null).length;
    const attackerVillages = villagesByPlayer.get(attackerPlayerId) ?? 0;

    if (attackerVillages === totalVillages) {
      // L'attaquant a gagné
      await this.prisma.game.update({
        where: { id: game.id },
        data: {
          status:   'finished',
          winnerId: attackerPlayerId,
          endedAt:  new Date(),
        },
      });
      return { gameId: game.id, winnerId: attackerPlayerId };
    }

    return null; // Partie continue
  }
}
