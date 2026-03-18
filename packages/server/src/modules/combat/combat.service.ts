import { PrismaClient } from '@prisma/client';
import { GameDataRegistry } from '../../engine/game-data-registry';
import { AttackQueue } from '../../engine/queue/queues/attack.queue';
import { calculateTravelTime } from '@mmorts/shared';

export class CombatService {
  constructor(
    private prisma:     PrismaClient,
    private gameData:   GameDataRegistry,
    private attackQueue: AttackQueue,
  ) {}

  // ── Lancer une attaque ──
  async sendAttack(
    attackerVillageId: string,
    defenderVillageId: string,
    units: Record<string, number>, // { spearman: 5, cavalry: 2 }
  ) {
    if (attackerVillageId === defenderVillageId) {
      throw new Error('Vous ne pouvez pas attaquer votre propre village.');
    }

    // 1. Récupérer les deux villages
    const [attacker, defender] = await Promise.all([
      this.prisma.village.findUnique({
        where:   { id: attackerVillageId },
        include: { troops: true },
      }),
      this.prisma.village.findUnique({
        where:  { id: defenderVillageId },
        select: { id: true, x: true, y: true, name: true },
      }),
    ]);

    if (!attacker) throw new Error('Village attaquant introuvable.');
    if (!defender) throw new Error('Village cible introuvable.');

    // 2. Vérifier que l'attaquant a assez de troupes et déduire
    const troopMap = Object.fromEntries(attacker.troops.map(t => [t.unitType, t.count]));
    const unitSpeeds: number[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const [unitType, count] of Object.entries(units)) {
        if (count <= 0) continue;

        const available = troopMap[unitType] ?? 0;
        if (available < count) {
          throw new Error(`Pas assez de ${unitType} disponibles (${available} dispo, ${count} demandés).`);
        }

        // Déduire les troupes envoyées
        await tx.troop.update({
          where: { villageId_unitType: { villageId: attackerVillageId, unitType } },
          data:  { count: { decrement: count } },
        });

        // Récupérer la vitesse pour le calcul du trajet
        try {
          const def = this.gameData.getUnitDef(unitType);
          unitSpeeds.push(def.speed);
        } catch { continue; }
      }
    });

    // 3. Calculer le temps de trajet
    // Vitesse = unité la plus lente (speed = secondes par case)
    const unitList = Object.entries(units)
      .filter(([, c]) => c > 0)
      .map(([unitType]) => {
        const def = this.gameData.getUnitDef(unitType);
        return { unitType, count: units[unitType], speed: def.speed };
      });

    const travelSec = calculateTravelTime(
      attacker.x, attacker.y,
      defender.x, defender.y,
      unitList,
    );
    const travelMs = travelSec * 1000;

    // 4. Envoyer le job BullMQ avec délai = temps de trajet
    const job = await this.attackQueue.addJob(
      { attackerVillageId, defenderVillageId, units },
      travelMs,
    );

    const arrivesAt = new Date(Date.now() + travelMs);

    return {
      jobId:             job.id,
      attackerVillageId,
      defenderVillageId,
      defenderName:      defender.name,
      units,
      travelSec,
      arrivesAt,
    };
  }

  // ── Récupérer les rapports de combat d'un village ──
  async getReports(villageId: string) {
    return await this.prisma.attackReport.findMany({
      where: {
        OR: [
          { attackerVillageId: villageId },
          { defenderVillageId: villageId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
