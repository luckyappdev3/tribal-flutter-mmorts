// ─────────────────────────────────────────────────────────────
// game-speed.utils.ts — Utilitaire pour trouver le gameSpeed
// Gère à la fois Game (Phase 8) et GameWorld (monde classique)
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

/**
 * Récupère le gameSpeed applicable à un village
 * Priorité : Game (si Phase 8) > GameWorld (monde classique)
 */
export async function getVillageGameSpeed(
  prisma: PrismaClient,
  villageId: string,
): Promise<number> {
  try {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      select: { gameId: true, worldId: true },
    });

    if (!village) return 1.0;

    // Phase 8 : Partie solo avec gameSpeed propre
    if (village.gameId) {
      const game = await prisma.game.findUnique({
        where: { id: village.gameId },
        select: { gameSpeed: true },
      });
      if (game?.gameSpeed) return game.gameSpeed;
    }

    // Monde classique : utiliser GameWorld
    if (village.worldId) {
      const world = await prisma.gameWorld.findUnique({
        where: { id: village.worldId },
        select: { gameSpeed: true },
      });
      if (world?.gameSpeed) return world.gameSpeed;
    }

    // Fallback
    return 1.0;
  } catch {
    return 1.0;
  }
}
