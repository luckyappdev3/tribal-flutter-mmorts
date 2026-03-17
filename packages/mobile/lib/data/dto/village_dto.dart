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

class VillageDto {
  final String id;
  final String name;
  final double wood;
  final double stone;
  final double iron;
  final ProductionRatesDto productionRates;
  final BuildQueueDto? buildQueue;

  VillageDto({
    required this.id,
    required this.name,
    required this.wood,
    required this.stone,
    required this.iron,
    required this.productionRates,
    this.buildQueue,
  });

  factory VillageDto.fromJson(Map<String, dynamic> json) {
    final ratesJson = json['productionRates'] as Map<String, dynamic>? ?? {};
    return VillageDto(
      id:    json['id']   as String,
      name:  json['name'] as String,
      wood:  (json['wood']  as num).toDouble(),
      stone: (json['stone'] as num).toDouble(),
      iron:  (json['iron']  as num).toDouble(),
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

  static const Map<String, String> displayNames = {
    'headquarters': 'Quartier Général',
    'timber_camp':  'Camp de Bois',
    'quarry':       'Carrière',
    'iron_mine':    'Mine de Fer',
    'warehouse':    'Entrepôt',
  };

  String get displayName => displayNames[buildingId] ?? buildingId;

  BuildingInstanceDto({required this.buildingId, required this.level});

  factory BuildingInstanceDto.fromJson(Map<String, dynamic> json) {
    return BuildingInstanceDto(
      buildingId: json['buildingId'] as String,
      level:      json['level']      as int,
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
