import 'package:freezed_annotation/freezed_annotation.dart';
part 'movements_event.freezed.dart';

@freezed
class MovementsEvent with _$MovementsEvent {
  const factory MovementsEvent.loadRequested(String villageId)  = _LoadRequested;
  const factory MovementsEvent.refreshRequested()               = _RefreshRequested;
  const factory MovementsEvent.tick()                           = _Tick;
  const factory MovementsEvent.attackResult(Map<String, dynamic> data)   = _AttackResult;
  const factory MovementsEvent.attackIncoming(Map<String, dynamic> data) = _AttackIncoming;
  const factory MovementsEvent.troopsReturned(Map<String, dynamic> data) = _TroopsReturned;
}
