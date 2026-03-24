class UnitCostDto {
  final int wood;
  final int stone;
  final int iron;

  const UnitCostDto({required this.wood, required this.stone, required this.iron});

  factory UnitCostDto.fromJson(Map<String, dynamic> json) => UnitCostDto(
        wood:  (json['wood']  as num).toInt(),
        stone: (json['stone'] as num).toInt(),
        iron:  (json['iron']  as num).toInt(),
      );
}

class TroopDto {
  final String unitType;
  final String name;
  final int count;
  final int attack;
  final int defenseGeneral;
  final int defenseCavalry;
  final int defenseArcher;
  final int speed;
  final int carryCapacity;
  final int recruitTime;          // temps de base (secondes, référence JSON)
  final int effectiveRecruitTime; // temps réel appliqué (gamespeed + bâtiment)
  final UnitCostDto cost;
  final double  effectiveSpeed;  // s/case avec gamespeed appliqué
  final int     populationCost;
  final bool    prerequisiteMet;
  final String? prerequisiteMsg;

  static const Map<String, String> descriptions = {
    'spearman':       'Défense solide, efficace contre la cavalerie',
    'swordsman':      'Spécialiste anti-infanterie',
    'axeman':         'Attaque pure, pilier de l\'armée offensive',
    'archer':         'Défense polyvalente, faible contre archers montés',
    'scout':          'Espionnage rapide des villages ennemis',
    'light_cavalry':  'Pillage rapide, forte attaque',
    'mounted_archer': 'Contre les archers sur les remparts',
    'heavy_cavalry':  'Élite : attaque et défense excellentes',
    'ram':            'Détruit les fortifications avant combat',
    'catapult':       'Réduit les bâtiments ennemis en cendres',
    'paladin':        'Héros unique, reliques sacrées',
    'noble':          'Capture les villages ennemis',
    // Retiré — conservé uniquement pour les anciens rapports de combat
    'cavalry':        'Unité retirée',
  };

  static const Map<String, String> icons = {
    'spearman':       '🗡️',
    'swordsman':      '⚔️',
    'axeman':         '🪓',
    'archer':         '🏹',
    'scout':          '🔍',
    'light_cavalry':  '🐴',
    'mounted_archer': '🏇',
    'heavy_cavalry':  '🛡️',
    'ram':            '🐏',
    'catapult':       '💣',
    'paladin':        '⭐',
    'noble':          '👑',
    'cavalry':        '🐴',
  };

  static const Map<String, String> names = {
    'spearman':       'Lancier',
    'swordsman':      'Porteur d\'Épée',
    'axeman':         'Guerrier à la Hache',
    'archer':         'Archer',
    'scout':          'Éclaireur',
    'light_cavalry':  'Cavalerie Légère',
    'mounted_archer': 'Archer Monté',
    'heavy_cavalry':  'Cavalerie Lourde',
    'ram':            'Bélier',
    'catapult':       'Catapulte',
    'paladin':        'Paladin',
    'noble':          'Noble',
    'cavalry':        'Cavalier',
  };

  String get description => descriptions[unitType] ?? '';
  String get icon        => icons[unitType]        ?? '⚔️';

  // Formate la vitesse effective (s/case) en durée lisible
  String get formattedSpeed {
    final s = effectiveSpeed;
    if (s <= 0) return '?';
    if (s < 60)   return '${s.toStringAsFixed(s < 10 ? 1 : 0)}s';
    final mins = (s / 60).floor();
    final secs = (s % 60).round();
    if (mins < 60) return secs > 0 ? '${mins}m ${secs}s' : '${mins}m';
    final h = (mins / 60).floor();
    final m = mins % 60;
    return m > 0 ? '${h}h ${m}m' : '${h}h';
  }

  // Formate le temps effectif (gamespeed + bâtiment déjà appliqués)
  String formattedRecruitTime(int count) {
    final secs = effectiveRecruitTime * count;
    if (secs < 60)   return '${secs}s';
    if (secs < 3600) { final m = secs ~/ 60; final s = secs % 60; return s > 0 ? '${m}m ${s}s' : '${m}m'; }
    final h = secs ~/ 3600; final m = (secs % 3600) ~/ 60;
    return m > 0 ? '${h}h ${m}m' : '${h}h';
  }

  const TroopDto({
    required this.unitType,
    required this.name,
    required this.count,
    required this.attack,
    required this.defenseGeneral,
    required this.defenseCavalry,
    required this.defenseArcher,
    required this.speed,
    required this.carryCapacity,
    required this.recruitTime,
    required this.effectiveRecruitTime,
    required this.cost,
    this.effectiveSpeed  = 0,
    this.populationCost  = 1,
    this.prerequisiteMet = true,
    this.prerequisiteMsg,
  });

  factory TroopDto.fromJson(Map<String, dynamic> json) => TroopDto(
        unitType:             json['unitType']             as String,
        name:                 json['name']                 as String,
        count:                json['count']                as int,
        attack:               (json['attack']              as num).toInt(),
        defenseGeneral:       (json['defenseGeneral']      as num).toInt(),
        defenseCavalry:       (json['defenseCavalry']      as num).toInt(),
        defenseArcher:        (json['defenseArcher']       as num).toInt(),
        speed:                (json['speed']               as num).toInt(),
        carryCapacity:        (json['carryCapacity']       as num).toInt(),
        recruitTime:          (json['recruitTime']         as num).toInt(),
        effectiveRecruitTime: (json['effectiveRecruitTime'] as num?)?.toInt()
                              ?? (json['recruitTime']      as num).toInt(),
        cost:            UnitCostDto.fromJson(json['cost'] as Map<String, dynamic>),
        effectiveSpeed:  (json['effectiveSpeed']  as num?)?.toDouble()
                         ?? (json['speed']        as num).toDouble(),
        populationCost:  (json['populationCost']  as num?)?.toInt() ?? 1,
        prerequisiteMet: (json['prerequisiteMet'] as bool?) ?? true,
        prerequisiteMsg: json['prerequisiteMsg']  as String?,
      );
}

class RecruitQueueDto {
  final String   id;
  final String   buildingType;
  final String   unitType;
  final int      totalCount;
  final int      trainedCount;
  final DateTime nextUnitAt;

  static const Map<String, String> buildingLabels = {
    'barracks': 'Caserne',
    'stable':   'Écurie',
    'garage':   'Atelier',
    'statue':   'Statue',
    'snob':     'Académie',
  };

  String get buildingLabel => buildingLabels[buildingType] ?? buildingType;
  int    get remaining     => totalCount - trainedCount;

  const RecruitQueueDto({
    required this.id,
    required this.buildingType,
    required this.unitType,
    required this.totalCount,
    required this.trainedCount,
    required this.nextUnitAt,
  });

  factory RecruitQueueDto.fromJson(Map<String, dynamic> json) => RecruitQueueDto(
        id:           json['id']           as String,
        buildingType: json['buildingType'] as String,
        unitType:     json['unitType']     as String,
        totalCount:   (json['totalCount']   as num).toInt(),
        trainedCount: (json['trainedCount'] as num).toInt(),
        nextUnitAt:   DateTime.parse(json['nextUnitAt'] as String).toLocal(),
      );
}

// ── NOUVEAU : Population (Ferme) ─────────────────────────────
class PopulationDto {
  final int used;
  final int max;
  final int farmLevel;

  const PopulationDto({required this.used, required this.max, required this.farmLevel});

  double get ratio => max > 0 ? (used / max).clamp(0.0, 1.0) : 0.0;
  bool get isFull  => used >= max;

  factory PopulationDto.fromJson(Map<String, dynamic> json) => PopulationDto(
        used:      (json['used']      as num).toInt(),
        max:       (json['max']       as num).toInt(),
        farmLevel: (json['farmLevel'] as num).toInt(),
      );
}

class TroopsResponseDto {
  final List<TroopDto>        troops;
  final List<RecruitQueueDto> queues;
  final PopulationDto?        population;

  const TroopsResponseDto({required this.troops, this.queues = const [], this.population});

  factory TroopsResponseDto.fromJson(Map<String, dynamic> json) {
    final rawTroops = json['troops'] as List<dynamic>? ?? [];
    final rawQueues = json['queues'] as List<dynamic>? ?? [];
    return TroopsResponseDto(
      troops:     rawTroops.map((t) => TroopDto.fromJson(t as Map<String, dynamic>)).toList(),
      queues:     rawQueues.map((q) => RecruitQueueDto.fromJson(q as Map<String, dynamic>)).toList(),
      population: json['population'] != null
          ? PopulationDto.fromJson(json['population'] as Map<String, dynamic>)
          : null,
    );
  }
}

// ─────────────────────────────────────────────
// Village info dans un rapport
// ─────────────────────────────────────────────
class ReportVillageDto {
  final String  id;
  final String  name;
  final int     x;
  final int     y;
  final String  playerName;
  final bool    isAbandoned;
  final int     abandonedLevel;

  const ReportVillageDto({
    required this.id,
    required this.name,
    required this.x,
    required this.y,
    required this.playerName,
    required this.isAbandoned,
    required this.abandonedLevel,
  });

  factory ReportVillageDto.fromJson(Map<String, dynamic> json) {
    final player = json['player'] as Map<String, dynamic>?;
    return ReportVillageDto(
      id:             json['id']             as String,
      name:           json['name']           as String,
      x:              json['x']              as int,
      y:              json['y']              as int,
      playerName:     player?['username']    as String? ?? 'Abandonné',
      isAbandoned:    json['isAbandoned']    as bool?   ?? false,
      abandonedLevel: json['abandonedLevel'] as int?    ?? 1,
    );
  }

  String get displayName => isAbandoned ? 'Village Abandonné (Niv.$abandonedLevel)' : name;
}

// ─────────────────────────────────────────────
// Rapport de combat enrichi
// ─────────────────────────────────────────────
class AttackReportDto {
  final String   id;
  final String   attackerVillageId;
  final String   defenderVillageId;
  final Map<String, int> unitsSent;
  final Map<String, int> unitsSurvived;
  final Map<String, int> defenderUnitsBefore;
  final Map<String, int> defenderUnitsAfter;
  final Map<String, int> resourcesLooted;
  final int      pointsGained;
  final int      pointsLost;
  final bool     attackerWon;
  final double   morale;      // ← NOUVEAU : 0.3 → 1.0
  final double   wallBonus;   // ← NOUVEAU : 1.0 → 2.0
  final DateTime createdAt;
  final ReportVillageDto? attackerVillage;
  final ReportVillageDto? defenderVillage;

  // Suivi lu/non-lu local (géré dans le BLoC)
  final bool isRead;

  bool isAttacker(String villageId) => attackerVillageId == villageId;

  // Pertes attaquant
  Map<String, int> get attackerLosses {
    final losses = <String, int>{};
    for (final entry in unitsSent.entries) {
      final survived = unitsSurvived[entry.key] ?? 0;
      final lost     = entry.value - survived;
      if (lost > 0) losses[entry.key] = lost;
    }
    return losses;
  }

  // Total des ressources pillées
  int get totalLooted =>
      (resourcesLooted['wood']  ?? 0) +
      (resourcesLooted['stone'] ?? 0) +
      (resourcesLooted['iron']  ?? 0);

  AttackReportDto copyWith({bool? isRead}) => AttackReportDto(
        id:                  id,
        attackerVillageId:   attackerVillageId,
        defenderVillageId:   defenderVillageId,
        unitsSent:           unitsSent,
        unitsSurvived:       unitsSurvived,
        defenderUnitsBefore: defenderUnitsBefore,
        defenderUnitsAfter:  defenderUnitsAfter,
        resourcesLooted:     resourcesLooted,
        pointsGained:        pointsGained,
        pointsLost:          pointsLost,
        attackerWon:         attackerWon,
        morale:              morale,
        wallBonus:           wallBonus,
        createdAt:           createdAt,
        attackerVillage:     attackerVillage,
        defenderVillage:     defenderVillage,
        isRead:              isRead ?? this.isRead,
      );

  const AttackReportDto({
    required this.id,
    required this.attackerVillageId,
    required this.defenderVillageId,
    required this.unitsSent,
    required this.unitsSurvived,
    required this.defenderUnitsBefore,
    required this.defenderUnitsAfter,
    required this.resourcesLooted,
    required this.pointsGained,
    required this.pointsLost,
    required this.attackerWon,
    this.morale   = 1.0,
    this.wallBonus = 1.0,
    required this.createdAt,
    this.attackerVillage,
    this.defenderVillage,
    this.isRead = false,
  });

  factory AttackReportDto.fromJson(Map<String, dynamic> json) {
    Map<String, int> toIntMap(dynamic raw) {
      if (raw == null) return {};
      return (raw as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as num).toInt()));
    }
    return AttackReportDto(
      id:                  json['id']                as String,
      attackerVillageId:   json['attackerVillageId'] as String,
      defenderVillageId:   json['defenderVillageId'] as String,
      unitsSent:           toIntMap(json['unitsSent']),
      unitsSurvived:       toIntMap(json['unitsSurvived']),
      defenderUnitsBefore: toIntMap(json['defenderUnitsBefore']),
      defenderUnitsAfter:  toIntMap(json['defenderUnitsAfter']),
      resourcesLooted:     toIntMap(json['resourcesLooted']),
      pointsGained:        (json['pointsGained'] as num).toInt(),
      pointsLost:          (json['pointsLost']   as num).toInt(),
      attackerWon:         json['attackerWon']   as bool,
      morale:              (json['morale']    as num?)?.toDouble() ?? 1.0,
      wallBonus:           (json['wallBonus'] as num?)?.toDouble() ?? 1.0,
      createdAt:           DateTime.parse(json['createdAt'] as String).toLocal(),
      attackerVillage:     json['attackerVillage'] != null
          ? ReportVillageDto.fromJson(json['attackerVillage'] as Map<String, dynamic>)
          : null,
      defenderVillage:     json['defenderVillage'] != null
          ? ReportVillageDto.fromJson(json['defenderVillage'] as Map<String, dynamic>)
          : null,
    );
  }
}

// ─────────────────────────────────────────────
// Rapport d'espionnage
// ─────────────────────────────────────────────
class ScoutReportDto {
  final String id;
  final String attackerVillageId;
  final String defenderVillageId;

  final int    scoutsSent;
  final int    scoutsLost;
  final int    scoutsSurvived;
  final double survivorRatio;
  /// 0 = échec total, 1/2/3 = paliers d'information croissants
  final int    tier;

  // Palier 1 (tier >= 1)
  final Map<String, int>? resources;    // wood/stone/iron/food
  final Map<String, int>? troopsAtHome; // unitType → count

  // Palier 2 (tier >= 2)
  final Map<String, int>? buildings;   // buildingId → level

  // Palier 3 (tier >= 3)
  final Map<String, int>? troopsOutside; // unitType → count

  final ReportVillageDto? attackerVillage;
  final ReportVillageDto? defenderVillage;
  final DateTime createdAt;
  final bool     isRead;
  final bool     isDefenderReport;
  final int      defenderScoutsKilled;

  const ScoutReportDto({
    required this.id,
    required this.attackerVillageId,
    required this.defenderVillageId,
    required this.scoutsSent,
    required this.scoutsLost,
    required this.scoutsSurvived,
    required this.survivorRatio,
    required this.tier,
    required this.createdAt,
    this.resources,
    this.troopsAtHome,
    this.buildings,
    this.troopsOutside,
    this.attackerVillage,
    this.defenderVillage,
    this.isRead = false,
    this.isDefenderReport = false,
    this.defenderScoutsKilled = 0,
  });

  ScoutReportDto copyWith({bool? isRead}) => ScoutReportDto(
    id:                   id,
    attackerVillageId:    attackerVillageId,
    defenderVillageId:    defenderVillageId,
    scoutsSent:           scoutsSent,
    scoutsLost:           scoutsLost,
    scoutsSurvived:       scoutsSurvived,
    survivorRatio:        survivorRatio,
    tier:                 tier,
    createdAt:            createdAt,
    resources:            resources,
    troopsAtHome:         troopsAtHome,
    buildings:            buildings,
    troopsOutside:        troopsOutside,
    attackerVillage:      attackerVillage,
    defenderVillage:      defenderVillage,
    isRead:               isRead ?? this.isRead,
    isDefenderReport:     isDefenderReport,
    defenderScoutsKilled: defenderScoutsKilled,
  );

  factory ScoutReportDto.fromJson(Map<String, dynamic> json) {
    Map<String, int>? toIntMap(dynamic raw) {
      if (raw == null) return null;
      return (raw as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as num).toInt()));
    }
    return ScoutReportDto(
      id:                   json['id']                as String,
      attackerVillageId:    json['attackerVillageId'] as String,
      defenderVillageId:    json['defenderVillageId'] as String,
      scoutsSent:           (json['scoutsSent']      as num).toInt(),
      scoutsLost:           (json['scoutsLost']      as num).toInt(),
      scoutsSurvived:       (json['scoutsSurvived']  as num).toInt(),
      survivorRatio:        (json['survivorRatio']   as num).toDouble(),
      tier:                 (json['tier']            as num).toInt(),
      createdAt:            DateTime.parse(json['createdAt'] as String).toLocal(),
      resources:            toIntMap(json['resources']),
      troopsAtHome:         toIntMap(json['troopsAtHome']),
      buildings:            toIntMap(json['buildings']),
      troopsOutside:        toIntMap(json['troopsOutside']),
      attackerVillage:      json['attackerVillage'] != null
          ? ReportVillageDto.fromJson(json['attackerVillage'] as Map<String, dynamic>)
          : null,
      defenderVillage:      json['defenderVillage'] != null
          ? ReportVillageDto.fromJson(json['defenderVillage'] as Map<String, dynamic>)
          : null,
      isDefenderReport:     json['isDefenderReport'] as bool? ?? false,
      defenderScoutsKilled: (json['defenderScoutsKilled'] as num?)?.toInt() ?? 0,
    );
  }
}
