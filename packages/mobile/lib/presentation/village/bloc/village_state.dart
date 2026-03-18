import 'package:freezed_annotation/freezed_annotation.dart';
part 'village_state.freezed.dart';

@freezed
class VillageState with _$VillageState {
  const factory VillageState.initial() = _Initial;
  const factory VillageState.loading() = _Loading;
  const factory VillageState.loaded({
    required String id,
    required String name,
    required double wood,
    required double stone,
    required double iron,
    // Taux de production par seconde pour l'interpolation locale
    @Default(0.0) double woodRate,
    @Default(0.0) double stoneRate,
    @Default(0.0) double ironRate,
    @Default(5000.0) double maxStorage,
  }) = _Loaded;
  const factory VillageState.error(String message) = _Error;
}
