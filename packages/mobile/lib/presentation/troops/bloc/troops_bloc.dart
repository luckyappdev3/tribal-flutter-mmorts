import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../core/services/tab_refresh_service.dart';
import '../../../data/remote/api/troops_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import 'troops_event.dart';
import 'troops_state.dart';

class TroopsBloc extends Bloc<TroopsEvent, TroopsState> {
  final TroopsApi     _troopsApi     = getIt<TroopsApi>();
  final SocketService _socketService = getIt<SocketService>();
  StreamSubscription? _tabSub;

  TroopsBloc() : super(const TroopsState.initial()) {
    on<TroopsEvent>(_onEvent);

    // Chaque unité libérée → rafraîchir les troupes
    _socketService.instance.on('troops:unit_ready', (data) {
      add(TroopsEvent.recruitFinished(data is Map<String, dynamic> ? data : {}));
    });

    // Conserver la compatibilité avec l'ancien événement
    _socketService.instance.on('troops:ready', (data) {
      add(TroopsEvent.recruitFinished(data is Map<String, dynamic> ? data : {}));
    });

    _socketService.instance.on('troops:returned', (_) {
      final villageId = state.maybeWhen(
        loaded: (vid, _, __, ___) => vid,
        orElse: () => null,
      );
      if (villageId != null) add(TroopsEvent.loadRequested(villageId));
    });

    _tabSub = TabRefreshService.instance.stream.listen((index) {
      if (index == TabIndex.troops) {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __, ___) => vid,
          orElse: () => null,
        );
        if (villageId != null) add(TroopsEvent.loadRequested(villageId));
      }
    });
  }

  Future<void> _onEvent(TroopsEvent event, Emitter<TroopsState> emit) async {
    await event.when(

      loadRequested: (villageId) async {
        emit(const TroopsState.loading());
        try {
          final dto = await _troopsApi.getTroops(villageId);
          emit(TroopsState.loaded(
            villageId:  villageId,
            troops:     dto.troops,
            queues:     dto.queues,
            population: dto.population,
          ));
        } catch (e) {
          emit(TroopsState.error('Chargement impossible : $e'));
        }
      },

      recruitRequested: (unitType, count) async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __, ___) => vid,
          orElse: () => null,
        );
        if (villageId == null) return;

        emit(const TroopsState.recruiting());
        try {
          await _troopsApi.recruit(villageId, unitType, count);
          final dto = await _troopsApi.getTroops(villageId);
          emit(TroopsState.loaded(
            villageId:  villageId,
            troops:     dto.troops,
            queues:     dto.queues,
            population: dto.population,
          ));
        } catch (e) {
          if (villageId.isNotEmpty) {
            try {
              final dto = await _troopsApi.getTroops(villageId);
              emit(TroopsState.loaded(
                villageId:  villageId,
                troops:     dto.troops,
                queues:     dto.queues,
                population: dto.population,
              ));
            } catch (_) {}
          }
          emit(TroopsState.error('$e'));
        }
      },

      recruitFinished: (data) async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __, ___) => vid,
          orElse: () => null,
        );
        if (villageId == null) return;
        final dto = await _troopsApi.getTroops(villageId);
        emit(TroopsState.loaded(
          villageId:  villageId,
          troops:     dto.troops,
          queues:     dto.queues,
          population: dto.population,
        ));
      },

      cancelRequested: (queueId) async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __, ___) => vid,
          orElse: () => null,
        );
        if (villageId == null) return;
        try {
          await _troopsApi.cancelRecruit(villageId, queueId);
        } catch (_) { /* ignore — server returns error if already done */ }
        final dto = await _troopsApi.getTroops(villageId);
        emit(TroopsState.loaded(
          villageId:  villageId,
          troops:     dto.troops,
          queues:     dto.queues,
          population: dto.population,
        ));
      },
    );
  }

  @override
  Future<void> close() {
    _tabSub?.cancel();
    return super.close();
  }
}
