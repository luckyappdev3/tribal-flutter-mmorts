class BuildQueueDto {
  final String buildingId;
  final int targetLevel;
  final DateTime endsAt;

  BuildQueueDto({
    required this.buildingId,
    required this.targetLevel,
    required this.endsAt,
  });

  factory BuildQueueDto.fromJson(Map<String, dynamic> json) {
    return BuildQueueDto(
      buildingId:  json['buildingId']  as String,
      targetLevel: json['targetLevel'] as int,
      endsAt:      DateTime.parse(json['endsAt'] as String).toLocal(),
    );
  }
}

class ProductionRatesDto {
  final double wood;
  final double stone;
  final double iron;

  ProductionRatesDto({
    required this.wood,
    required this.stone,
    required this.iron,
  });

  factory ProductionRatesDto.fromJson(Map<String, dynamic> json) {
    return ProductionRatesDto(
      wood:  (json['wood']  as num).toDouble(),
      stone: (json['stone'] as num).toDouble(),
      iron:  (json['iron']  as num).toDouble(),
    );
  }
}

class NextLevelCostDto {
  final int wood;
  final int stone;
  final int iron;

  NextLevelCostDto({
    required this.wood,
    required this.stone,
    required this.iron,
  });

  factory NextLevelCostDto.fromJson(Map<String, dynamic> json) {
    return NextLevelCostDto(
      wood:  (json['wood']  as num).toInt(),
      stone: (json['stone'] as num).toInt(),
      iron:  (json['iron']  as num).toInt(),
    );
  }
}

class VillageDto {
  final String id;
  final String name;
  final double wood;
  final double stone;
  final double iron;
  final double maxStorage;
  final ProductionRatesDto productionRates;
  final BuildQueueDto? buildQueue;

  VillageDto({
    required this.id,
    required this.name,
    required this.wood,
    required this.stone,
    required this.iron,
    required this.maxStorage,
    required this.productionRates,
    this.buildQueue,
  });

  factory VillageDto.fromJson(Map<String, dynamic> json) {
    final ratesJson = json['productionRates'] as Map<String, dynamic>? ?? {};
    return VillageDto(
      id:         json['id']   as String,
      name:       json['name'] as String,
      wood:       (json['wood']  as num).toDouble(),
      stone:      (json['stone'] as num).toDouble(),
      iron:       (json['iron']  as num).toDouble(),
      maxStorage: (json['maxStorage'] as num?)?.toDouble() ?? 5000.0,
      productionRates: ProductionRatesDto.fromJson(ratesJson),
      buildQueue: json['buildQueue'] != null
          ? BuildQueueDto.fromJson(json['buildQueue'] as Map<String, dynamic>)
          : null,
    );
  }
}

class BuildingInstanceDto {
  final String buildingId;
  final int level;
  final NextLevelCostDto? nextLevelCost;
  final int? nextLevelTimeSec;
  // Production par seconde — null pour les bâtiments non producteurs (QG, entrepôt)
  final double? currentProdPerSec;
  final double? nextProdPerSec;

  static const Map<String, String> displayNames = {
    'headquarters': 'Quartier Général',
    'timber_camp':  'Camp de Bois',
    'quarry':       'Carrière',
    'iron_mine':    'Mine de Fer',
    'warehouse':    'Entrepôt',
  };

  String get displayName => displayNames[buildingId] ?? buildingId;

  bool get isProducer => currentProdPerSec != null;
  bool get isMaxLevel => nextLevelCost == null;

  /// Formate la durée en secondes → "10s", "1m 30s", "2h 10m"
  String get formattedTime {
    if (nextLevelTimeSec == null) return '';
    final secs = nextLevelTimeSec!;
    if (secs < 60)   return '${secs}s';
    if (secs < 3600) {
      final m = secs ~/ 60;
      final s = secs % 60;
      return s > 0 ? '${m}m ${s}s' : '${m}m';
    }
    final h = secs ~/ 3600;
    final m = (secs % 3600) ~/ 60;
    return m > 0 ? '${h}h ${m}m' : '${h}h';
  }

  /// Formate un taux /s en string lisible : "10.0/s" ou "1.5k/s"
  static String formatRate(double rate) {
    if (rate >= 1000) return '${(rate / 1000).toStringAsFixed(1)}k/s';
    if (rate >= 10)   return '${rate.toStringAsFixed(0)}/s';
    return '${rate.toStringAsFixed(1)}/s';
  }

  BuildingInstanceDto({
    required this.buildingId,
    required this.level,
    this.nextLevelCost,
    this.nextLevelTimeSec,
    this.currentProdPerSec,
    this.nextProdPerSec,
  });

  factory BuildingInstanceDto.fromJson(Map<String, dynamic> json) {
    return BuildingInstanceDto(
      buildingId:       json['buildingId'] as String,
      level:            json['level']      as int,
      nextLevelCost:    json['nextLevelCost'] != null
          ? NextLevelCostDto.fromJson(json['nextLevelCost'] as Map<String, dynamic>)
          : null,
      nextLevelTimeSec: json['nextLevelTimeSec'] as int?,
      currentProdPerSec: (json['currentProdPerSec'] as num?)?.toDouble(),
      nextProdPerSec:    (json['nextProdPerSec']    as num?)?.toDouble(),
    );
  }
}

class VillageBuildingsDto {
  final List<BuildingInstanceDto> buildings;
  final BuildQueueDto? queue;

  VillageBuildingsDto({required this.buildings, this.queue});

  factory VillageBuildingsDto.fromJson(Map<String, dynamic> json) {
    final rawBuildings = json['buildings'] as List<dynamic>? ?? [];
    return VillageBuildingsDto(
      buildings: rawBuildings
          .map((b) => BuildingInstanceDto.fromJson(b as Map<String, dynamic>))
          .toList(),
      queue: json['queue'] != null
          ? BuildQueueDto.fromJson(json['queue'] as Map<String, dynamic>)
          : null,
    );
  }
}
