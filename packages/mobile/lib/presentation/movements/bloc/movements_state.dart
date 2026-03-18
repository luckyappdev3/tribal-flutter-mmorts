import 'package:freezed_annotation/freezed_annotation.dart';
import '../dto/movements_dto.dart';
part 'movements_state.freezed.dart';

@freezed
class MovementsState with _$MovementsState {
  const factory MovementsState.initial()                           = _Initial;
  const factory MovementsState.loading()                           = _Loading;
  const factory MovementsState.loaded({
    required String              villageId,
    required List<MovementDto>   movements,
    // Notification d'attaque entrante à afficher en popup
    Map<String, dynamic>?        incomingAlert,
    @Default(false) bool         hasNewReport,
  }) = _Loaded;
  const factory MovementsState.error(String message)               = _Error;
}
