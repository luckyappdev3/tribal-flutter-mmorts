import 'package:freezed_annotation/freezed_annotation.dart';
part 'village_state.freezed.dart';

@freezed
class VillageState with _$VillageState {
  const factory VillageState.initial() = _Initial;
  const factory VillageState.loading() = _Loading;
  const factory VillageState.loaded({
    required String id,
    required String name,
    required int wood,
    required int stone,
    required int iron,
    // On pourra ajouter la file de construction ici plus tard [cite: 150]
  }) = _Loaded;
  const factory VillageState.error(String message) = _Error;
}