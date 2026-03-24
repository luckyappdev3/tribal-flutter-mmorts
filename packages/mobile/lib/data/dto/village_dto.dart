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

class MissingPrerequisiteDto {
  final String buildingId;
  final int required;
  final int current;

  MissingPrerequisiteDto({
    required this.buildingId,
    required this.required,
    required this.current,
  });

  factory MissingPrerequisiteDto.fromJson(Map<String, dynamic> json) {
    return MissingPrerequisiteDto(
      buildingId: json['buildingId'] as String,
      required:   (json['required'] as num).toInt(),
      current:    (json['current']  as num).toInt(),
    );
  }

  String get label {
    final name = BuildingInstanceDto.displayNames[buildingId] ?? buildingId;
    return '$name niv.$required';
  }
}

class BuildingInstanceDto {
  final String buildingId;
  final int level;
  final NextLevelCostDto? nextLevelCost;
  final int? nextLevelTimeSec;
  final double? currentProdPerSec;
  final double? nextProdPerSec;
  final bool isLocked;
  final List<MissingPrerequisiteDto> missingPrerequisites;

  // ── Noms affichés pour tous les bâtiments du registre ──────
  static const Map<String, String> displayNames = {
    'headquarters': 'Quartier Général',
    'timber_camp':  'Camp de Bois',
    'quarry':       'Carrière',
    'iron_mine':    'Mine de Fer',
    'warehouse':    'Entrepôt',
    'barracks':     'Caserne',
    // ── Nouveaux bâtiments Phase 1 ──────────────────────────
    'farm':         'Ferme',
    'wall':         'Mur d\'enceinte',
    'stable':       'Écuries',
    'rally_point':  'Place d\'armes',
    'garage':       'Atelier',
    'snob':         'Académie',
    'smith':        'Forge',
    'hiding_spot':  'Cachette',
    'statue':       'Statue',
    'market':       'Marché',
  };

  // ── Icônes par bâtiment ─────────────────────────────────────
  static const Map<String, String> buildingIcons = {
    'headquarters': '🏛️',
    'timber_camp':  '🪵',
    'quarry':       '⛏️',
    'iron_mine':    '⚙️',
    'warehouse':    '🏪',
    'barracks':     '⚔️',
    'farm':         '🌾',
    'wall':         '🏰',
    'stable':       '🐴',
    'rally_point':  '🚩',
    'garage':       '🔧',
    'snob':         '🎓',
    'smith':        '⚒️',
    'hiding_spot':  '🏚️',
    'statue':       '🗿',
    'market':       '🛒',
  };

  String get displayName => displayNames[buildingId] ?? buildingId;
  String get icon        => buildingIcons[buildingId] ?? '🏗️';

  bool get isProducer  => currentProdPerSec != null;
  bool get isMaxLevel  => nextLevelCost == null;

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

  /// Formate un taux /s en string lisible
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
    this.isLocked = false,
    this.missingPrerequisites = const [],
  });

  factory BuildingInstanceDto.fromJson(Map<String, dynamic> json) {
    final rawMissing = json['missingPrerequisites'] as List<dynamic>? ?? [];
    return BuildingInstanceDto(
      buildingId:           json['buildingId'] as String,
      level:                json['level']      as int,
      nextLevelCost:        json['nextLevelCost'] != null
          ? NextLevelCostDto.fromJson(json['nextLevelCost'] as Map<String, dynamic>)
          : null,
      nextLevelTimeSec:     json['nextLevelTimeSec'] as int?,
      currentProdPerSec:    (json['currentProdPerSec'] as num?)?.toDouble(),
      nextProdPerSec:       (json['nextProdPerSec']    as num?)?.toDouble(),
      isLocked:             json['isLocked'] as bool? ?? false,
      missingPrerequisites: rawMissing
          .map((e) => MissingPrerequisiteDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class BuildQueueItemDto {
  final String   buildingId;
  final int      targetLevel;
  final int      position;
  final DateTime endsAt;

  BuildQueueItemDto({
    required this.buildingId,
    required this.targetLevel,
    required this.position,
    required this.endsAt,
  });

  factory BuildQueueItemDto.fromJson(Map<String, dynamic> json) {
    return BuildQueueItemDto(
      buildingId:  json['buildingId']  as String,
      targetLevel: json['targetLevel'] as int,
      position:    json['position']    as int,
      endsAt:      DateTime.parse(json['endsAt'] as String).toLocal(),
    );
  }
}

class VillageBuildingsDto {
  final List<BuildingInstanceDto> buildings;
  final BuildQueueDto?            queue;       // 1er item (compat)
  final int                       queueCount;
  final List<BuildQueueItemDto>   queueItems;  // ← NOUVEAU : toute la file

  VillageBuildingsDto({
    required this.buildings,
    this.queue,
    this.queueCount = 0,
    this.queueItems = const [],
  });

  factory VillageBuildingsDto.fromJson(Map<String, dynamic> json) {
    final rawBuildings = json['buildings'] as List<dynamic>? ?? [];
    final rawItems     = json['queueItems'] as List<dynamic>? ?? [];
    return VillageBuildingsDto(
      buildings:  rawBuildings
          .map((b) => BuildingInstanceDto.fromJson(b as Map<String, dynamic>))
          .toList(),
      queue: json['queue'] != null
          ? BuildQueueDto.fromJson(json['queue'] as Map<String, dynamic>)
          : null,
      queueCount: (json['queueCount'] as num?)?.toInt() ?? 0,
      queueItems: rawItems
          .map((i) => BuildQueueItemDto.fromJson(i as Map<String, dynamic>))
          .toList(),
    );
  }
}
