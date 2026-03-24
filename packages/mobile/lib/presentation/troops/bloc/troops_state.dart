import 'package:freezed_annotation/freezed_annotation.dart';
import '../dto/troops_dto.dart';
part 'troops_state.freezed.dart';

@freezed
class TroopsState with _$TroopsState {
  const factory TroopsState.initial()   = _Initial;
  const factory TroopsState.loading()   = _Loading;
  const factory TroopsState.loaded({
    required String                villageId,
    required List<TroopDto>        troops,
    required List<RecruitQueueDto> queues,
    PopulationDto?                 population,
  }) = _Loaded;
  const factory TroopsState.recruiting() = _Recruiting;
  const factory TroopsState.error(String message) = _Error;
}
