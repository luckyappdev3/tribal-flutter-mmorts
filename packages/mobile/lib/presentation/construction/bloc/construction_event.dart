import 'package:freezed_annotation/freezed_annotation.dart';
part 'construction_event.freezed.dart';

@freezed
class ConstructionEvent with _$ConstructionEvent {
  const factory ConstructionEvent.loadRequested(String villageId)  = _LoadRequested;
  const factory ConstructionEvent.upgradeRequested(String buildingId) = _UpgradeRequested;
  const factory ConstructionEvent.buildFinished(Map<String, dynamic> data) = _BuildFinished;
}
