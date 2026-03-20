import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../core/services/tab_refresh_service.dart';
import '../../../data/remote/api/troops_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import '../../troops/dto/troops_dto.dart';
import 'reports_event.dart';
import 'reports_state.dart';

class ReportsBloc extends Bloc<ReportsEvent, ReportsState> {
  final TroopsApi     _api           = getIt<TroopsApi>();
  final SocketService _socketService = getIt<SocketService>();
  StreamSubscription? _tabSub;

  // IDs des rapports déjà lus (local)
  final Set<String> _readIds = {};

  ReportsBloc() : super(const ReportsState.initial()) {
    on<ReportsEvent>(_onEvent);

    _socketService.instance.on('attack:result',   (_) => add(const ReportsEvent.newReportReceived()));
    _socketService.instance.on('attack:incoming', (_) => add(const ReportsEvent.newReportReceived()));

    _tabSub = TabRefreshService.instance.stream.listen((index) {
      if (index == TabIndex.reports) add(const ReportsEvent.refreshRequested());
    });
  }

  Future<void> _onEvent(ReportsEvent event, Emitter<ReportsState> emit) async {
    await event.when(
      loadRequested: (villageId) async {
        emit(const ReportsState.loading());
        try {
          final raw     = await _api.getReports(villageId);
          final reports = _applyReadStatus(raw);
          emit(ReportsState.loaded(
            villageId:   villageId,
            reports:     reports,
            unreadCount: reports.where((r) => !r.isRead).length,
          ));
        } catch (e) {
          emit(ReportsState.error('$e'));
        }
      },

      refreshRequested: () async {
        final villageId = state.maybeWhen(loaded: (vid, _, __) => vid, orElse: () => null);
        if (villageId == null) return;
        try {
          final raw     = await _api.getReports(villageId);
          final reports = _applyReadStatus(raw);
          emit(ReportsState.loaded(
            villageId:   villageId,
            reports:     reports,
            unreadCount: reports.where((r) => !r.isRead).length,
          ));
        } catch (_) {}
      },

      newReportReceived: () async {
        final villageId = state.maybeWhen(loaded: (vid, _, __) => vid, orElse: () => null);
        if (villageId == null) return;
        try {
          final raw     = await _api.getReports(villageId);
          final reports = _applyReadStatus(raw);
          emit(ReportsState.loaded(
            villageId:   villageId,
            reports:     reports,
            unreadCount: reports.where((r) => !r.isRead).length,
          ));
        } catch (_) {}
      },

      markRead: (reportId) {
        _readIds.add(reportId);
        state.maybeWhen(
          loaded: (villageId, reports, _) {
            final updated = reports.map((r) =>
              r.id == reportId ? r.copyWith(isRead: true) : r
            ).toList();
            emit(ReportsState.loaded(
              villageId:   villageId,
              reports:     updated,
              unreadCount: updated.where((r) => !r.isRead).length,
            ));
          },
          orElse: () {},
        );
      },

      markAllRead: () {
        state.maybeWhen(
          loaded: (villageId, reports, _) {
            for (final r in reports) { _readIds.add(r.id); }
            final updated = reports.map((r) => r.copyWith(isRead: true)).toList();
            emit(ReportsState.loaded(
              villageId:   villageId,
              reports:     updated,
              unreadCount: 0,
            ));
          },
          orElse: () {},
        );
      },
    );
  }

  List<AttackReportDto> _applyReadStatus(List<AttackReportDto> reports) {
    return reports.map((r) => r.copyWith(isRead: _readIds.contains(r.id))).toList();
  }

  @override
  Future<void> close() {
    _tabSub?.cancel();
    return super.close();
  }
}
