class MovementVillageDto {
  final String id;
  final String name;
  final int x;
  final int y;

  const MovementVillageDto({
    required this.id,
    required this.name,
    required this.x,
    required this.y,
  });

  factory MovementVillageDto.fromJson(Map<String, dynamic> json) =>
      MovementVillageDto(
        id:   json['id']   as String,
        name: json['name'] as String,
        x:    json['x']    as int,
        y:    json['y']    as int,
      );
}

class MovementDto {
  final String id;

  /// 'traveling' ou 'returning'
  final String status;

  /// 'outgoing' (attaque lancée) ou 'incoming' (attaque reçue)
  final String direction;

  final Map<String, int> units;
  final Map<String, int>? survivors;

  final DateTime departsAt;
  final DateTime arrivesAt;

  final MovementVillageDto attackerVillage;
  final MovementVillageDto defenderVillage;

  bool get isOutgoing  => direction == 'outgoing';
  bool get isTraveling => status    == 'traveling';
  bool get isReturning => status    == 'returning';

  /// Durée restante
  Duration get remaining {
    final diff = arrivesAt.difference(DateTime.now());
    return diff.isNegative ? Duration.zero : diff;
  }

  String get formattedRemaining {
    final d = remaining;
    if (d == Duration.zero) return 'Arrivé';
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }

  const MovementDto({
    required this.id,
    required this.status,
    required this.direction,
    required this.units,
    this.survivors,
    required this.departsAt,
    required this.arrivesAt,
    required this.attackerVillage,
    required this.defenderVillage,
  });

  factory MovementDto.fromJson(Map<String, dynamic> json) {
    Map<String, int> toIntMap(dynamic raw) {
      if (raw == null) return {};
      return (raw as Map<String, dynamic>)
          .map((k, v) => MapEntry(k, (v as num).toInt()));
    }

    return MovementDto(
      id:        json['id']        as String,
      status:    json['status']    as String,
      direction: json['direction'] as String,
      units:     toIntMap(json['units']),
      survivors: json['survivors'] != null ? toIntMap(json['survivors']) : null,
      departsAt: DateTime.parse(json['departsAt'] as String).toLocal(),
      arrivesAt: DateTime.parse(json['arrivesAt'] as String).toLocal(),
      attackerVillage: MovementVillageDto.fromJson(
          json['attackerVillage'] as Map<String, dynamic>),
      defenderVillage: MovementVillageDto.fromJson(
          json['defenderVillage'] as Map<String, dynamic>),
    );
  }
}
