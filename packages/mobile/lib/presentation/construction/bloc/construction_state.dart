import 'package:freezed_annotation/freezed_annotation.dart';
import '../../../data/dto/village_dto.dart';
part 'construction_state.freezed.dart';

@freezed
class ConstructionState with _$ConstructionState {
  const factory ConstructionState.initial() = _Initial;
  const factory ConstructionState.loading() = _Loading;

  const factory ConstructionState.loaded({
    required String                  villageId,
    required List<BuildingInstanceDto> buildings,
    required BuildQueueDto?          queue,
    @Default(0.0) double wood,
    @Default(0.0) double stone,
    @Default(0.0) double iron,
    @Default(0.0) double woodRate,
    @Default(0.0) double stoneRate,
    @Default(0.0) double ironRate,
    @Default(5000.0) double maxStorage,
  }) = _Loaded;

  const factory ConstructionState.upgrading({
    @Default(0.0) double wood,
    @Default(0.0) double stone,
    @Default(0.0) double iron,
    @Default(0.0) double woodRate,
    @Default(0.0) double stoneRate,
    @Default(0.0) double ironRate,
    @Default(5000.0) double maxStorage,
  }) = _Upgrading;

  const factory ConstructionState.error(String message) = _Error;
}
