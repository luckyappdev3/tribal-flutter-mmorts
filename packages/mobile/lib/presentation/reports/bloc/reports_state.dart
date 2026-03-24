import 'package:freezed_annotation/freezed_annotation.dart';
import '../../troops/dto/troops_dto.dart';
part 'reports_state.freezed.dart';

@freezed
class ReportsState with _$ReportsState {
  const factory ReportsState.initial()   = _Initial;
  const factory ReportsState.loading()   = _Loading;
  const factory ReportsState.loaded({
    required String                 villageId,
    required List<CombatReportDto>  reports,
    @Default(0) int                 unreadCount,
  }) = _Loaded;
  const factory ReportsState.error(String message) = _Error;
}
