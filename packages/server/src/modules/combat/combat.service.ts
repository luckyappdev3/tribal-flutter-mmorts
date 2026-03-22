import { PrismaClient } from '@prisma/client';
import { GameDataRegistry } from '../../engine/game-data-registry';
import { AttackQueue } from '../../engine/queue/queues/attack.queue';
import { calculateTravelTime } from '@mmorts/shared';

export class CombatService {
  constructor(
    private prisma:      PrismaClient,
    private gameData:    GameDataRegistry,
    private attackQueue: AttackQueue,
  ) {}

  async sendAttack(
    attackerVillageId: string,
    defenderVillageId: string,
    units: Record<string, number>,
  ) {
    if (attackerVillageId === defenderVillageId) {
      throw new Error('Vous ne pouvez pas attaquer votre propre village.');
    }

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

    // ── NOUVEAU : vérifier la Place d'armes ──
    const rallyPoint = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId: attackerVillageId, buildingId: 'rally_point' } },
    });
    if (!rallyPoint || rallyPoint.level < 1) {
      throw new Error('Vous devez construire une Place d\'armes pour envoyer des attaques.');
    }

    const troopMap = Object.fromEntries(attacker.troops.map(t => [t.unitType, t.count]));

    await this.prisma.$transaction(async (tx) => {
      for (const [unitType, count] of Object.entries(units)) {
        if (count <= 0) continue;
        const available = troopMap[unitType] ?? 0;
        if (available < count) {
          throw new Error(`Pas assez de ${unitType} (${available} dispo, ${count} demandés).`);
        }
        await tx.troop.update({
          where: { villageId_unitType: { villageId: attackerVillageId, unitType } },
          data:  { count: { decrement: count } },
        });
      }
    });

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
    const travelMs  = travelSec * 1000;
    const arrivesAt = new Date(Date.now() + travelMs);

    const activeAttack = await this.prisma.activeAttack.create({
      data: {
        attackerVillageId,
        defenderVillageId,
        units,
        arrivesAt,
        status: 'traveling',
      },
    });

    await this.attackQueue.addJob(
      { attackerVillageId, defenderVillageId, units, activeAttackId: activeAttack.id, travelMs } as any,
      travelMs,
    );

    return {
      activeAttackId:    activeAttack.id,
      attackerVillageId,
      defenderVillageId,
      defenderName:      defender.name,
      units,
      travelSec,
      arrivesAt,
    };
  }

  async getReports(villageId: string) {
    const reports = await this.prisma.attackReport.findMany({
      where: {
        OR: [
          { attackerVillageId: villageId },
          { defenderVillageId: villageId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take:    100,
      include: {
        attackerVillage: {
          select: {
            id:      true,
            name:    true,
            x:       true,
            y:       true,
            player:  { select: { id: true, username: true } },
            isAbandoned: true,
          },
        },
        defenderVillage: {
          select: {
            id:      true,
            name:    true,
            x:       true,
            y:       true,
            player:  { select: { id: true, username: true } },
            isAbandoned:    true,
            abandonedLevel: true,
          },
        },
      },
    });

    return reports;
  }

  async getMovements(villageId: string) {
    const movements = await this.prisma.activeAttack.findMany({
      where: {
        OR: [
          { attackerVillageId: villageId },
          { defenderVillageId: villageId },
        ],
      },
      include: {
        attackerVillage: { select: { id: true, name: true, x: true, y: true } },
        defenderVillage: { select: { id: true, name: true, x: true, y: true } },
      },
      orderBy: { arrivesAt: 'asc' },
    });

    return movements.map(m => ({
      id:               m.id,
      status:           m.status,
      direction:        m.attackerVillageId === villageId ? 'outgoing' : 'incoming',
      units:            m.units,
      survivors:        m.survivors,
      departsAt:        m.departsAt,
      arrivesAt:        m.arrivesAt,
      attackerVillage:  m.attackerVillage,
      defenderVillage:  m.defenderVillage,
    }));
  }
}
