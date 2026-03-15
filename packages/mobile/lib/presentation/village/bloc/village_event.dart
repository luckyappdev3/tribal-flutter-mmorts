import 'package:freezed_annotation/freezed_annotation.dart';
part 'village_event.freezed.dart';

@freezed
class VillageEvent with _$VillageEvent {
  const factory VillageEvent.loadRequested(String villageId) = _LoadRequested;
  const factory VillageEvent.resourcesUpdated(Map<String, dynamic> data) = _ResourcesUpdated;
}