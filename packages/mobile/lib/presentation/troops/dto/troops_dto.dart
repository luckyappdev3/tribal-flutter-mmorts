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
  final int defense;
  final int speed;
  final int carryCapacity;
  final int recruitTime;
  final UnitCostDto cost;

  static const Map<String, String> descriptions = {
    'spearman':  'Défense solide, efficace contre la cavalerie',
    'swordsman': 'Unité polyvalente, bonne défense',
    'axeman':    'Attaque pure, idéal pour les raids',
    'cavalry':   'Rapide, grande capacité de transport',
    'archer':    'Attaque à distance, fragile',
  };

  static const Map<String, String> icons = {
    'spearman':  '🗡️',
    'swordsman': '⚔️',
    'axeman':    '🪓',
    'cavalry':   '🐴',
    'archer':    '🏹',
  };

  static const Map<String, String> names = {
    'spearman':  'Lancier',
    'swordsman': 'Épéiste',
    'axeman':    'Hacheur',
    'cavalry':   'Cavalier',
    'archer':    'Archer',
  };

  String get description => descriptions[unitType] ?? '';
  String get icon        => icons[unitType]        ?? '⚔️';

  String formattedRecruitTime(int count) {
    final secs = recruitTime * count;
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
    required this.defense,
    required this.speed,
    required this.carryCapacity,
    required this.recruitTime,
    required this.cost,
  });

  factory TroopDto.fromJson(Map<String, dynamic> json) => TroopDto(
        unitType:      json['unitType']      as String,
        name:          json['name']          as String,
        count:         json['count']         as int,
        attack:        json['attack']        as int,
        defense:       json['defense']       as int,
        speed:         json['speed']         as int,
        carryCapacity: json['carryCapacity'] as int,
        recruitTime:   json['recruitTime']   as int,
        cost: UnitCostDto.fromJson(json['cost'] as Map<String, dynamic>),
      );
}

class RecruitQueueDto {
  final String   unitType;
  final int      count;
  final DateTime endsAt;

  const RecruitQueueDto({required this.unitType, required this.count, required this.endsAt});

  factory RecruitQueueDto.fromJson(Map<String, dynamic> json) => RecruitQueueDto(
        unitType: json['unitType'] as String,
        count:    json['count']    as int,
        endsAt:   DateTime.parse(json['endsAt'] as String).toLocal(),
      );
}

class TroopsResponseDto {
  final List<TroopDto> troops;
  final RecruitQueueDto? queue;

  const TroopsResponseDto({required this.troops, this.queue});

  factory TroopsResponseDto.fromJson(Map<String, dynamic> json) {
    final rawTroops = json['troops'] as List<dynamic>? ?? [];
    return TroopsResponseDto(
      troops: rawTroops.map((t) => TroopDto.fromJson(t as Map<String, dynamic>)).toList(),
      queue:  json['queue'] != null
          ? RecruitQueueDto.fromJson(json['queue'] as Map<String, dynamic>)
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
