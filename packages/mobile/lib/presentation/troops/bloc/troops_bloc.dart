import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/troops_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import 'troops_event.dart';
import 'troops_state.dart';

class TroopsBloc extends Bloc<TroopsEvent, TroopsState> {
  final TroopsApi     _troopsApi     = getIt<TroopsApi>();
  final SocketService _socketService = getIt<SocketService>();

  TroopsBloc() : super(const TroopsState.initial()) {
    on<TroopsEvent>(_onEvent);

    // Socket : recrutement terminé → recharger
    _socketService.instance.on('troops:ready', (data) {
      add(TroopsEvent.recruitFinished(
        data is Map<String, dynamic> ? data : {},
      ));
    });
  }

  Future<void> _onEvent(TroopsEvent event, Emitter<TroopsState> emit) async {
    await event.when(
      loadRequested: (villageId) async {
        emit(const TroopsState.loading());
        try {
          final dto = await _troopsApi.getTroops(villageId);
          emit(TroopsState.loaded(
            villageId: villageId,
            troops:    dto.troops,
            queue:     dto.queue,
          ));
        } catch (e) {
          emit(TroopsState.error('Chargement impossible : $e'));
        }
      },

      recruitRequested: (unitType, count) async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __) => vid,
          orElse: () => null,
        );
        final queue = state.maybeWhen(
          loaded: (_, __, q) => q,
          orElse: () => null,
        );
        if (villageId == null || queue != null) return;

        emit(const TroopsState.recruiting());
        try {
          await _troopsApi.recruit(villageId, unitType, count);
          final dto = await _troopsApi.getTroops(villageId);
          emit(TroopsState.loaded(
            villageId: villageId,
            troops:    dto.troops,
            queue:     dto.queue,
          ));
        } catch (e) {
          // En cas d'erreur, recharger l'état réel
          if (villageId.isNotEmpty) {
            try {
              final dto = await _troopsApi.getTroops(villageId);
              emit(TroopsState.loaded(villageId: villageId, troops: dto.troops, queue: dto.queue));
            } catch (_) {}
          }
          emit(TroopsState.error('$e'));
        }
      },

      recruitFinished: (data) async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __) => vid,
          orElse: () => null,
        );
        if (villageId == null) return;

        final dto = await _troopsApi.getTroops(villageId);
        emit(TroopsState.loaded(
          villageId: villageId,
          troops:    dto.troops,
          queue:     null,
        ));
      },
    );
  }
}
