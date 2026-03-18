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

  String get description => descriptions[unitType] ?? '';
  String get icon        => icons[unitType]        ?? '⚔️';

  /// Temps de recrutement formaté pour N unités
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

class AttackReportDto {
  final String   id;
  final String   attackerVillageId;
  final String   defenderVillageId;
  final Map<String, int> unitsSent;
  final Map<String, int> unitsSurvived;
  final Map<String, int> resourcesLooted;
  final int      pointsGained;
  final int      pointsLost;
  final bool     attackerWon;
  final DateTime createdAt;

  bool isAttacker(String villageId) => attackerVillageId == villageId;

  const AttackReportDto({
    required this.id,
    required this.attackerVillageId,
    required this.defenderVillageId,
    required this.unitsSent,
    required this.unitsSurvived,
    required this.resourcesLooted,
    required this.pointsGained,
    required this.pointsLost,
    required this.attackerWon,
    required this.createdAt,
  });

  factory AttackReportDto.fromJson(Map<String, dynamic> json) {
    Map<String, int> toIntMap(dynamic raw) {
      if (raw == null) return {};
      return (raw as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as num).toInt()));
    }
    return AttackReportDto(
      id:                json['id']                as String,
      attackerVillageId: json['attackerVillageId'] as String,
      defenderVillageId: json['defenderVillageId'] as String,
      unitsSent:         toIntMap(json['unitsSent']),
      unitsSurvived:     toIntMap(json['unitsSurvived']),
      resourcesLooted:   toIntMap(json['resourcesLooted']),
      pointsGained:      (json['pointsGained'] as num).toInt(),
      pointsLost:        (json['pointsLost']   as num).toInt(),
      attackerWon:       json['attackerWon']   as bool,
      createdAt:         DateTime.parse(json['createdAt'] as String).toLocal(),
    );
  }
}
