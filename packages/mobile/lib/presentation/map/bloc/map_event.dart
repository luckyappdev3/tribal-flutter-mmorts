import 'package:freezed_annotation/freezed_annotation.dart';
part 'map_event.freezed.dart';

@freezed
class MapEvent with _$MapEvent {
  const factory MapEvent.loadRequested({ @Default(500) int x, @Default(500) int y }) = _LoadRequested;
  const factory MapEvent.panned({ required int x, required int y })                   = _Panned;
}
