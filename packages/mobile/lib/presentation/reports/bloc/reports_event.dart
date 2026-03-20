import 'package:freezed_annotation/freezed_annotation.dart';
part 'reports_event.freezed.dart';

@freezed
class ReportsEvent with _$ReportsEvent {
  const factory ReportsEvent.loadRequested(String villageId)  = _LoadRequested;
  const factory ReportsEvent.refreshRequested()               = _RefreshRequested;
  const factory ReportsEvent.newReportReceived()              = _NewReportReceived;
  const factory ReportsEvent.markRead(String reportId)        = _MarkRead;
  const factory ReportsEvent.markAllRead()                    = _MarkAllRead;
}
