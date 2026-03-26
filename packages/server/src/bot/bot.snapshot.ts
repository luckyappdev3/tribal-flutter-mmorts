// ─────────────────────────────────────────────────────────────
// bot.snapshot.ts — Adaptateur Prisma → GameSnapshot
// Lit l'état complet d'un village bot et le transforme en
// structures propres utilisées par le ScoreEngine.
// ─────────────────────────────────────────────────────────────

import { PrismaClient }        from '@prisma/client';
import { GameDataRegistry }    from '../engine/game-data-registry';
import {
  calculateCostForLevel,
  calculateTimeForLevel,
} from '@mmorts/shared';
import {
  getHourlyProductionRate,
  calcMaxStorage,
  calcWallBonus,
  calcMaxPopulation,
  calcTotalPopUsed,
} from '@mmorts/shared';
import { calculateTravelTime } from '@mmorts/shared';

import {
  GameSnapshot,
  BotBuilding,
  BotUnit,
  BotTarget,
  BotIncomingAttack,
  BotOutgoingAttack,
} from './bot.types';

// ── Constantes ───────────────────────────────────────────────

// Quel bâtiment entraîne quelle unité
const UNIT_BUILDING_TYPE: Record<string, string> = {
  spearman:       'barracks',
  swordsman:      'barracks',
  axeman:         'barracks',
  archer:         'barracks',
  scout:          'stable',
  light_cavalry:  'stable',
  mounted_archer: 'stable',
  heavy_cavalry:  'stable',
  ram:            'garage',
  catapult:       'garage',
  paladin:        'statue',
  noble:          'academy',
};

// Classification offensif / défensif
const UNIT_ROLE: Record<string, BotUnit['type']> = {
  spearman:       'defensive',
  swordsman:      'defensive',
  archer:         'defensive',
  heavy_cavalry:  'defensive',
  paladin:        'defensive',
  axeman:         'offensive',
  light_cavalry:  'offensive',
  mounted_archer: 'offensive',
  ram:            'siege',
  catapult:       'siege',
  scout:          'scout',
  noble:          'conquest',
};

// Unités offensives (contribuent à offensivePower)
const OFFENSIVE_UNITS = new Set(['axeman', 'light_cavalry', 'mounted_archer', 'catapult']);

// Unités défensives (contribuent à defensivePower)
const DEFENSIVE_UNITS = new Set(['spearman', 'swordsman', 'archer', 'heavy_cavalry', 'paladin']);

// Seuil de troupes offensives pour qu'une attaque soit rentable
const ATTACK_CAPACITY = 500; // offensivePower minimum

// ─────────────────────────────────────────────────────────────

export async function getSnapshot(
  villageId:    string,
  prisma:       PrismaClient,
  gameData:     GameDataRegistry,
  visionRadius: number,
  scoutMemory:  Map<string, number> = new Map(), // targetId → timestamp de l'espionnage
): Promise<GameSnapshot> {

  // ── 1. Charger le village et ses relations ────────────────
  const village = await prisma.village.findUniqueOrThrow({
    where: { id: villageId },
    include: {
      buildings:    true,
      troops:       true,
      buildItems:   true,
      recruitQueues: true,
      world: { select: { gameSpeed: true, startsAt: true } },
    },
  });

  // Si le village n'est pas rattaché à un monde, fallback vers le premier monde disponible
  let worldData = village.world as any;
  if (!worldData) {
    worldData = await prisma.gameWorld.findFirst({ select: { gameSpeed: true, startsAt: true } });
  }
  const gameSpeed  = worldData?.gameSpeed ?? 1.0;
  const startsAt   = worldData?.startsAt  ?? new Date();
  // Temps de jeu = temps réel × gameSpeed (ex: gameSpeed=200 → 1s réel = 3.3min de jeu)
  const timeElapsedMinutes = (Date.now() - startsAt.getTime()) * gameSpeed / 60_000;

  // Lookup rapide par buildingId
  const buildingLevelMap = new Map<string, number>(
    village.buildings.map(b => [b.buildingId, b.level])
  );
  const getLevel = (id: string) => buildingLevelMap.get(id) ?? 0;

  // ── 2. Troupes home vs en transit ────────────────────────
  const outgoingAttacks = await prisma.activeAttack.findMany({
    where: { attackerVillageId: villageId, status: { in: ['traveling', 'returning'] } },
    select: { id: true, units: true, survivors: true, status: true, arrivesAt: true },
  });

  // Troupes en transit (en dehors du village — aller ou retour)
  const troopsInTransit: Record<string, number> = {};
  for (const atk of outgoingAttacks) {
    const units = (atk.status === 'returning' && atk.survivors
      ? atk.survivors
      : atk.units) as Record<string, number>;
    for (const [type, count] of Object.entries(units ?? {})) {
      troopsInTransit[type] = (troopsInTransit[type] ?? 0) + count;
    }
  }

  // Troupes au village (= total DB − en transit)
  const troopsHome: Record<string, number> = {};
  for (const troop of village.troops) {
    const inTransit = troopsInTransit[troop.unitType] ?? 0;
    troopsHome[troop.unitType] = Math.max(0, troop.count - inTransit);
  }

  // ── 3. Puissance offensive & défensive ───────────────────
  let offensivePower = 0;
  let defensivePower = 0;

  for (const [unitType, count] of Object.entries(troopsHome)) {
    if (count <= 0) continue;
    try {
      const def = gameData.getUnitDef(unitType);
      if (OFFENSIVE_UNITS.has(unitType)) offensivePower += count * def.attack;
      if (DEFENSIVE_UNITS.has(unitType)) defensivePower += count * def.defenseGeneral;
    } catch { /* unité inconnue ignorée */ }
  }

  // ── 4. Attaques entrantes ─────────────────────────────────
  const incoming = await prisma.activeAttack.findMany({
    where: { defenderVillageId: villageId, status: 'traveling' },
    select: { id: true, arrivesAt: true },
  });

  // Attaques sortantes rappelables (en aller = 'traveling', pas en retour)
  const outgoingTraveling: BotOutgoingAttack[] = outgoingAttacks
    .filter(a => a.status === 'traveling')
    .map(a => ({
      id:    a.id,
      units: a.units as Record<string, number>,
      // Temps de retour = temps restant avant arrivée (retournement sur place)
      returnEstimatedSeconds: Math.max(0, (a.arrivesAt.getTime() - Date.now()) / 1000),
    }));

  const incomingAttacks: BotIncomingAttack[] = incoming.map(a => ({
    id:                 a.id,
    attackerPower:      0,        // inconnu sans espionnage
    arrivalTimeSeconds: Math.max(0, (a.arrivesAt.getTime() - Date.now()) / 1000),
    isConfirmed:        false,
  }));

  // ── 5. Bâtiments disponibles à construire ─────────────────
  const queuedBuildingIds = new Set(village.buildItems.map(i => i.buildingId));
  const buildQueueCount   = village.buildItems.length;

  const availableBuildings: BotBuilding[] = [];

  for (const def of gameData.getAllBuildings()) {
    const currentLevel = getLevel(def.id);
    if (currentLevel >= def.maxLevel) continue;

    const nextLevel = currentLevel + 1;

    // Vérifier les prérequis
    const prereqs = def.prerequisites ?? {};
    const unlocked = Object.entries(prereqs).every(
      ([reqId, reqLevel]) => getLevel(reqId) >= (reqLevel as number)
    );

    // Coût du prochain niveau
    const rawCost     = calculateCostForLevel(def, nextLevel);
    const rawTimeSec  = calculateTimeForLevel(def, nextLevel);

    // Réduction HQ : -5% par niveau, appliquée au temps
    const hqLevel       = getLevel('headquarters');
    const hqReduction   = Math.min(0.95, hqLevel * 0.05);
    const buildTimeSec  = (rawTimeSec * (1 - hqReduction)) / gameSpeed;

    // Gain de production (mines uniquement)
    const productionGainPerHour =
      ['timber_camp', 'quarry', 'iron_mine'].includes(def.id)
        ? getHourlyProductionRate(nextLevel) - getHourlyProductionRate(currentLevel)
        : 0;

    // Bonus défensif (mur uniquement)
    const defenseBonus =
      def.id === 'wall'
        ? calcWallBonus(nextLevel) - calcWallBonus(currentLevel)
        : 0;

    availableBuildings.push({
      id:                    def.id,
      name:                  def.name,
      currentLevel,
      nextLevel,
      cost:                  { wood: rawCost.wood, stone: rawCost.stone, iron: rawCost.iron },
      buildTimeSeconds:      buildTimeSec,
      productionGainPerHour,
      defenseBonus,
      isUnlocked:            unlocked,
      isInQueue:             queuedBuildingIds.has(def.id),
    });
  }

  // ── 6. Unités disponibles au recrutement ──────────────────
  const activeRecruitBuildings = new Set(
    village.recruitQueues.map(q => q.buildingType)
  );

  const availableUnits: BotUnit[] = [];

  for (const def of gameData.getAllUnits()) {
    const buildingType = UNIT_BUILDING_TYPE[def.id];
    if (!buildingType) continue;

    // Vérifier les prérequis
    const unlocked = (def.requiredBuildings ?? []).every(
      (req: { buildingId: string; level: number }) =>
        getLevel(req.buildingId) >= req.level
    );

    // Temps de recrutement réduit par le niveau du bâtiment (-6%/niveau)
    const bldLevel         = getLevel(buildingType);
    const speedMultiplier  = Math.pow(0.94, Math.max(0, bldLevel - 1));
    const recruitTimeSec   = Math.max(1, (def.recruitTime * speedMultiplier) / gameSpeed);

    availableUnits.push({
      id:                  def.id,
      name:                def.name,
      buildingType,
      type:                UNIT_ROLE[def.id] ?? 'offensive',
      attack:              def.attack,
      defenseGeneral:      def.defenseGeneral,
      defenseCavalry:      def.defenseCavalry,
      defenseArcher:       def.defenseArcher,
      speedSecondsPerTile: def.speed / gameSpeed,
      cost:                { wood: def.cost.wood, stone: def.cost.stone, iron: def.cost.iron },
      recruitTimeSeconds:  recruitTimeSec,
      carryCapacity:       def.carryCapacity,
      isUnlocked:          unlocked,
    });
  }

  // ── 7. Cibles visibles (villages à portée) ────────────────
  const nearbyVillages = await prisma.village.findMany({
    where: {
      id: { not: villageId },
      x:  { gte: village.x - visionRadius, lte: village.x + visionRadius },
      y:  { gte: village.y - visionRadius, lte: village.y + visionRadius },
    },
    select: {
      id: true, x: true, y: true,
      wood: true, stone: true, iron: true,
      playerId: true, isBot: true, isAbandoned: true,
      player: { select: { totalPoints: true } },
    },
    take: 50,
  });

  // Unité de référence pour estimer le trajet (axeman : 1080 sec/case)
  const REF_SPEED = 1080;

  const allTargets: BotTarget[] = nearbyVillages.map(v => {
    const travelSec = calculateTravelTime(
      village.x, village.y, v.x, v.y,
      REF_SPEED,
      gameSpeed,
    );
    const dist = Math.sqrt(Math.pow(v.x - village.x, 2) + Math.pow(v.y - village.y, 2));

    // Estimation grossière des ressources disponibles
    const maxStorage = calcMaxStorage(1); // entrepôt L1 par défaut
    const estimatedResources = Math.floor((v.wood + v.stone + v.iron) * 0.5);

    // Estimation défense (inconnu sans espionnage)
    const points     = v.player?.totalPoints ?? 0;
    const defEstimate = v.isBot ? 100 : Math.max(0, points * 0.5);

    return {
      id:                 v.id,
      type:               (v.playerId == null || v.isAbandoned) ? 'barbarian' : 'player',
      distanceTiles:      Math.round(dist * 10) / 10,
      travelTimeSeconds:  travelSec,
      estimatedResources,
      defensivePower:     defEstimate,
      points,
      lastScouted:        scoutMemory.get(v.id) ?? null,
    };
  });

  // ── 8. Population disponible ─────────────────────────────
  // Même calcul que construction.service : bâtiments + troupes home + troupes en attaque
  const farmLevel      = getLevel('farm');
  const maxPop         = calcMaxPopulation(farmLevel);
  const buildingPopUsed = calcTotalPopUsed(
    village.buildings.map(b => ({ buildingId: b.buildingId, level: b.level }))
  );
  let troopPopUsed = 0;
  for (const troop of village.troops) {
    if (troop.count <= 0) continue;
    try {
      const def = gameData.getUnitDef(troop.unitType);
      troopPopUsed += troop.count * (def.populationCost ?? 1);
    } catch { /* unité inconnue ignorée */ }
  }
  // Troupes en transit : aller (units) ou retour (survivors)
  let attackPopUsed = 0;
  for (const atk of outgoingAttacks) {
    const units = (atk.status === 'returning' && atk.survivors
      ? atk.survivors
      : atk.units) as Record<string, number>;
    for (const [unitType, count] of Object.entries(units ?? {})) {
      if (!count) continue;
      try {
        const def = gameData.getUnitDef(unitType);
        attackPopUsed += count * (def.populationCost ?? 1);
      } catch { /* */ }
    }
  }
  const populationAvailable = Math.max(0, maxPop - buildingPopUsed - troopPopUsed - attackPopUsed);

  // ── 9. Niveaux clés ───────────────────────────────────────
  const timberLevel   = getLevel('timber_camp');
  const quarryLevel   = getLevel('quarry');
  const ironMineLevel = getLevel('iron_mine');
  const minesLevel    = (timberLevel + quarryLevel + ironMineLevel) / 3;

  // ── 9. Assembler le snapshot ──────────────────────────────
  return {
    villageId,

    wood:       village.wood,
    stone:      village.stone,
    iron:       village.iron,
    maxStorage: calcMaxStorage(getLevel('warehouse')),

    buildQueueCount,
    availableBuildings,

    recruitQueues:  Object.fromEntries(
      ['barracks', 'stable', 'garage', 'statue', 'academy'].map(bt => [
        bt,
        activeRecruitBuildings.has(bt),
      ])
    ),
    availableUnits,

    allTargets,

    incomingAttacks,
    outgoingTraveling,
    troopsHome,
    troopsInTransit,
    offensivePower,
    defensivePower,
    defenseThreshold: 200,
    attackCapacity:   ATTACK_CAPACITY,

    minesLevel,
    barracksLevel:   getLevel('barracks'),
    wallLevel:       getLevel('wall'),
    rallyPointBuilt: getLevel('rally_point') >= 1,

    populationAvailable,
    loyaltyPoints:       village.loyaltyPoints,
    bottleneckResource:  null, // calculé par BotBrain.tick() après l'historique
    conquestTargetId:    null, // sélectionné par BotBrain.tick() en phase late
    alliedVillages:      [],   // peuplé par BotBrain.tick() (21.1)
    attackRecklessness:  1.0,  // injecté par BotBrain.tick() (15.1)
    noEarlyPlayerAttack: false, // injecté par BotBrain.tick() (15.2)
    timeElapsedMinutes,
    recentHeavyLoss:     false, // mis à jour par BotBrain après résolution de combat
  };
}
