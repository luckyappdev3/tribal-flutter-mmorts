import 'package:freezed_annotation/freezed_annotation.dart';
import '../../../data/dto/village_dto.dart';
part 'construction_state.freezed.dart';

@freezed
class ConstructionState with _$ConstructionState {
  const factory ConstructionState.initial()             = _Initial;
  const factory ConstructionState.loading()             = _Loading;
  const factory ConstructionState.loaded({
    required String villageId,
    required List<BuildingInstanceDto> buildings,
    required BuildQueueDto? queue,
  }) = _Loaded;
  const factory ConstructionState.upgrading()           = _Upgrading;
  const factory ConstructionState.error(String message) = _Error;
}
