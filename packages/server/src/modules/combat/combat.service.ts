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
    catapultTarget?: string,
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

    // Vitesse de l'unité la plus lente (secondes/case)
    const slowestSpeed = Math.max(...unitList.map(u => u.speed));

    // GameSpeed du monde
    const villageWithWorld = await this.prisma.village.findUnique({
      where: { id: attackerVillageId },
      include: { world: { select: { gameSpeed: true } } },
    });
    const gameSpeed = (villageWithWorld as any)?.world?.gameSpeed ?? 1.0;

    const travelSec = calculateTravelTime(
      attacker.x, attacker.y,
      defender.x, defender.y,
      slowestSpeed,
      gameSpeed,
    );
    const travelMs  = travelSec * 1000;
    const arrivesAt = new Date(Date.now() + travelMs);

    // Valider la cible de catapulte (interdit : hiding_spot)
    const FORBIDDEN_CAT_TARGETS = new Set(['hiding_spot']);
    if (catapultTarget && FORBIDDEN_CAT_TARGETS.has(catapultTarget)) {
      throw new Error('La Cachette ne peut pas être ciblée par les catapultes.');
    }

    const activeAttack = await this.prisma.activeAttack.create({
      data: {
        attackerVillageId,
        defenderVillageId,
        units,
        arrivesAt,
        status: 'traveling',
        ...(catapultTarget ? { catapultTarget } : {}),
      },
    });

    await this.attackQueue.addJob(
      { attackerVillageId, defenderVillageId, units, activeAttackId: activeAttack.id, travelMs, catapultTarget } as any,
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

  async sendScout(
    attackerVillageId: string,
    defenderVillageId: string,
    scoutCount: number,
  ) {
    if (attackerVillageId === defenderVillageId) {
      throw new Error('Vous ne pouvez pas espionner votre propre village.');
    }
    if (scoutCount <= 0) {
      throw new Error('Vous devez envoyer au moins un éclaireur.');
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

    const rallyPoint = await this.prisma.buildingInstance.findUnique({
      where: { villageId_buildingId: { villageId: attackerVillageId, buildingId: 'rally_point' } },
    });
    if (!rallyPoint || rallyPoint.level < 1) {
      throw new Error('Vous devez construire une Place d\'armes pour envoyer des éclaireurs.');
    }

    const troopMap = Object.fromEntries(attacker.troops.map(t => [t.unitType, t.count]));
    const available = troopMap['scout'] ?? 0;
    if (available < scoutCount) {
      throw new Error(`Pas assez d'éclaireurs (${available} dispo, ${scoutCount} demandés).`);
    }

    await this.prisma.troop.update({
      where: { villageId_unitType: { villageId: attackerVillageId, unitType: 'scout' } },
      data:  { count: { decrement: scoutCount } },
    });

    const scoutDef = this.gameData.getUnitDef('scout');
    const villageWithWorld = await this.prisma.village.findUnique({
      where: { id: attackerVillageId },
      include: { world: { select: { gameSpeed: true } } },
    });
    const gameSpeed = (villageWithWorld as any)?.world?.gameSpeed ?? 1.0;

    const travelSec = calculateTravelTime(
      attacker.x, attacker.y,
      defender.x, defender.y,
      scoutDef.speed,
      gameSpeed,
    );
    const travelMs  = travelSec * 1000;
    const arrivesAt = new Date(Date.now() + travelMs);

    const activeAttack = await this.prisma.activeAttack.create({
      data: {
        attackerVillageId,
        defenderVillageId,
        units:       { scout: scoutCount },
        arrivesAt,
        status:      'traveling',
        missionType: 'scout',
      },
    });

    await this.attackQueue.addJob(
      {
        attackerVillageId,
        defenderVillageId,
        units:          { scout: scoutCount },
        activeAttackId: activeAttack.id,
        travelMs,
        missionType:    'scout',
      } as any,
      travelMs,
    );

    return {
      activeAttackId:    activeAttack.id,
      attackerVillageId,
      defenderVillageId,
      defenderName:      defender.name,
      scoutCount,
      travelSec,
      arrivesAt,
    };
  }

  // ── Rappel : retourner une armée en cours de trajet ──────────
  async recall(attackId: string, attackerVillageId: string): Promise<void> {
    const attack = await this.prisma.activeAttack.findUnique({
      where:  { id: attackId },
      select: { id: true, attackerVillageId: true, defenderVillageId: true, units: true, arrivesAt: true, status: true },
    });
    if (!attack || attack.status !== 'traveling') return; // déjà en retour ou résolu
    if (attack.attackerVillageId !== attackerVillageId) return;

    const remainingMs = Math.max(1000, attack.arrivesAt.getTime() - Date.now());
    const returnArrivesAt = new Date(Date.now() + remainingMs);

    const units = attack.units as Record<string, number>;

    await this.prisma.activeAttack.update({
      where: { id: attackId },
      data:  { status: 'returning', survivors: units as any, arrivesAt: returnArrivesAt },
    });

    await this.attackQueue.addJob(
      {
        attackerVillageId: attack.attackerVillageId,
        defenderVillageId: attack.defenderVillageId,
        units:             units as any,
        activeAttackId:    attack.id,
        returning:         true,
        travelMs:          remainingMs,
        survivors:         units,
      } as any,
      remainingMs,
    );
  }

  async getCombatReports(villageId: string) {
    const reports = await this.prisma.combatReport.findMany({
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
            id: true, name: true, x: true, y: true,
            isAbandoned: true, abandonedLevel: true,
            player: { select: { id: true, username: true } },
          },
        },
        defenderVillage: {
          select: {
            id: true, name: true, x: true, y: true,
            isAbandoned: true, abandonedLevel: true,
            player: { select: { id: true, username: true } },
          },
        },
      },
    });

    return reports.map(r => {
      const isDefenderReport = r.defenderVillageId === villageId;
      return {
        ...r,
        isDefenderReport,
        // Masquer les scouts envoyés dans le rapport côté défenseur
        scoutsSent: isDefenderReport && r.type !== 'attack' ? 0 : r.scoutsSent,
      };
    });
  }

  async getPlayerCombatReports(playerId: string) {
    const include = {
      attackerVillage: {
        select: {
          id: true, name: true, x: true, y: true,
          isAbandoned: true, abandonedLevel: true,
          player: { select: { id: true, username: true } },
        },
      },
      defenderVillage: {
        select: {
          id: true, name: true, x: true, y: true,
          isAbandoned: true, abandonedLevel: true,
          player: { select: { id: true, username: true } },
        },
      },
    };
    const reports = await this.prisma.combatReport.findMany({
      where: {
        OR: [
          { attackerPlayerId: playerId },
          { defenderPlayerId: playerId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take:    100,
      include,
    });

    return reports.map(r => {
      const isDefenderReport = r.defenderPlayerId === playerId;
      return {
        ...r,
        isDefenderReport,
        scoutsSent: isDefenderReport && r.type !== 'attack' ? 0 : r.scoutsSent,
      };
    });
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