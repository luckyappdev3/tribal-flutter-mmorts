import 'package:freezed_annotation/freezed_annotation.dart';
part 'map_state.freezed.dart';

class VillageMarker {
  final String id;
  final String name;
  final int x;
  final int y;
  final String playerId;
  final String playerName;
  final int totalPoints;

  const VillageMarker({
    required this.id,
    required this.name,
    required this.x,
    required this.y,
    required this.playerId,
    required this.playerName,
    required this.totalPoints,
  });

  factory VillageMarker.fromJson(Map<String, dynamic> json) {
    final player = json['player'] as Map<String, dynamic>? ?? {};
    return VillageMarker(
      id:          json['id']   as String,
      name:        json['name'] as String,
      x:           json['x']   as int,
      y:           json['y']   as int,
      playerId:    player['id']          as String? ?? '',
      playerName:  player['username']    as String? ?? '?',
      totalPoints: player['totalPoints'] as int?    ?? 0,
    );
  }
}

@freezed
class MapState with _$MapState {
  const factory MapState.initial()                             = _Initial;
  const factory MapState.loading()                             = _Loading;
  const factory MapState.loaded({
    required List<VillageMarker> villages,
    required int centerX,
    required int centerY,
  }) = _Loaded;
  const factory MapState.error(String message)                 = _Error;
}
