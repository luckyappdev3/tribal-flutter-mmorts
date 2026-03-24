import 'package:freezed_annotation/freezed_annotation.dart';
part 'troops_event.freezed.dart';

@freezed
class TroopsEvent with _$TroopsEvent {
  const factory TroopsEvent.loadRequested(String villageId)                     = _LoadRequested;
  const factory TroopsEvent.recruitRequested(String unitType, int count)        = _RecruitRequested;
  const factory TroopsEvent.recruitFinished(Map<String, dynamic> data)          = _RecruitFinished;
  const factory TroopsEvent.cancelRequested(String queueId)                     = _CancelRequested;
}
