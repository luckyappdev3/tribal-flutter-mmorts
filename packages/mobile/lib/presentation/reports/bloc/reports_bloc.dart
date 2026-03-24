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

  final Set<String> _readIds = {};

  ReportsBloc() : super(const ReportsState.initial()) {
    on<ReportsEvent>(_onEvent);

    _socketService.instance.on('attack:result',   (_) => add(const ReportsEvent.newReportReceived()));
    _socketService.instance.on('attack:incoming', (_) => add(const ReportsEvent.newReportReceived()));
    _socketService.instance.on('scout:result',    (_) => add(const ReportsEvent.newReportReceived()));
    _socketService.instance.on('scout:blocked',   (_) => add(const ReportsEvent.newReportReceived()));

    _tabSub = TabRefreshService.instance.stream.listen((index) {
      if (index == TabIndex.reports) add(const ReportsEvent.refreshRequested());
    });
  }

  Future<void> _onEvent(ReportsEvent event, Emitter<ReportsState> emit) async {
    await event.when(
      loadRequested: (villageId) async {
        emit(const ReportsState.loading());
        try {
          final (reports, scoutReports) = await _fetchAll(villageId);
          emit(ReportsState.loaded(
            villageId:    villageId,
            reports:      reports,
            scoutReports: scoutReports,
            unreadCount:  _countUnread(reports, scoutReports),
          ));
        } catch (e) {
          emit(ReportsState.error('$e'));
        }
      },

      refreshRequested: () async {
        final villageId = state.maybeWhen(loaded: (vid, _, __, ___) => vid, orElse: () => null);
        if (villageId == null) return;
        try {
          final (reports, scoutReports) = await _fetchAll(villageId);
          emit(ReportsState.loaded(
            villageId:    villageId,
            reports:      reports,
            scoutReports: scoutReports,
            unreadCount:  _countUnread(reports, scoutReports),
          ));
        } catch (_) {}
      },

      newReportReceived: () async {
        final villageId = state.maybeWhen(loaded: (vid, _, __, ___) => vid, orElse: () => null);
        if (villageId == null) return;
        try {
          final (reports, scoutReports) = await _fetchAll(villageId);
          emit(ReportsState.loaded(
            villageId:    villageId,
            reports:      reports,
            scoutReports: scoutReports,
            unreadCount:  _countUnread(reports, scoutReports),
          ));
        } catch (_) {}
      },

      markRead: (reportId) {
        _readIds.add(reportId);
        state.maybeWhen(
          loaded: (villageId, reports, scoutReports, _) {
            final updatedAttack = reports.map((r) =>
                r.id == reportId ? r.copyWith(isRead: true) : r).toList();
            final updatedScout = scoutReports.map((r) =>
                r.id == reportId ? r.copyWith(isRead: true) : r).toList();
            emit(ReportsState.loaded(
              villageId:    villageId,
              reports:      updatedAttack,
              scoutReports: updatedScout,
              unreadCount:  _countUnread(updatedAttack, updatedScout),
            ));
          },
          orElse: () {},
        );
      },

      markAllRead: () {
        state.maybeWhen(
          loaded: (villageId, reports, scoutReports, _) {
            for (final r in reports)      { _readIds.add(r.id); }
            for (final r in scoutReports) { _readIds.add(r.id); }
            final updatedAttack = reports.map((r) => r.copyWith(isRead: true)).toList();
            final updatedScout  = scoutReports.map((r) => r.copyWith(isRead: true)).toList();
            emit(ReportsState.loaded(
              villageId:    villageId,
              reports:      updatedAttack,
              scoutReports: updatedScout,
              unreadCount:  0,
            ));
          },
          orElse: () {},
        );
      },
    );
  }

  Future<(List<AttackReportDto>, List<ScoutReportDto>)> _fetchAll(String villageId) async {
    final results = await Future.wait([
      _api.getReports(villageId),
      _api.getScoutReports(villageId),
    ]);
    final attacks = _applyReadStatus(results[0] as List<AttackReportDto>);
    final scouts  = _applyScoutReadStatus(results[1] as List<ScoutReportDto>);
    return (attacks, scouts);
  }

  int _countUnread(List<AttackReportDto> attacks, List<ScoutReportDto> scouts) =>
      attacks.where((r) => !r.isRead).length + scouts.where((r) => !r.isRead).length;

  List<AttackReportDto> _applyReadStatus(List<AttackReportDto> reports) =>
      reports.map((r) => r.copyWith(isRead: _readIds.contains(r.id))).toList();

  List<ScoutReportDto> _applyScoutReadStatus(List<ScoutReportDto> reports) =>
      reports.map((r) => r.copyWith(isRead: _readIds.contains(r.id))).toList();

  @override
  Future<void> close() {
    _tabSub?.cancel();
    return super.close();
  }
}
