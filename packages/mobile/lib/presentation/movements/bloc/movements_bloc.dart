import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/movements_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import 'movements_event.dart';
import 'movements_state.dart';

class MovementsBloc extends Bloc<MovementsEvent, MovementsState> {
  final MovementsApi  _api           = getIt<MovementsApi>();
  final SocketService _socketService = getIt<SocketService>();
  Timer? _tickTimer;

  MovementsBloc() : super(const MovementsState.initial()) {
    on<MovementsEvent>(_onEvent);

    // Tick toutes les secondes pour mettre à jour les timers
    _tickTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => add(const MovementsEvent.tick()),
    );

    // Sockets
    _socketService.instance.on('attack:result', (data) {
      add(MovementsEvent.attackResult(
        data is Map<String, dynamic> ? data : {},
      ));
    });

    _socketService.instance.on('attack:incoming', (data) {
      add(MovementsEvent.attackIncoming(
        data is Map<String, dynamic> ? data : {},
      ));
    });

    _socketService.instance.on('troops:returned', (data) {
      add(MovementsEvent.troopsReturned(
        data is Map<String, dynamic> ? data : {},
      ));
    });
  }

  Future<void> _onEvent(
    MovementsEvent event,
    Emitter<MovementsState> emit,
  ) async {
    await event.when(
      loadRequested: (villageId) async {
        emit(const MovementsState.loading());
        try {
          final movements = await _api.getMovements(villageId);
          emit(MovementsState.loaded(
            villageId: villageId,
            movements: movements,
          ));
        } catch (e) {
          emit(MovementsState.error('$e'));
        }
      },

      refreshRequested: () async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __, ___) => vid,
          orElse: () => null,
        );
        if (villageId == null) return;
        final movements = await _api.getMovements(villageId);
        emit(MovementsState.loaded(
          villageId: villageId,
          movements: movements,
        ));
      },

      // Tick : juste rebuild pour rafraîchir les timers affichés
      tick: () {
        state.maybeWhen(
          loaded: (vid, movements, alert, hasNew) {
            emit(MovementsState.loaded(
              villageId:    vid,
              movements:    movements,
              incomingAlert: alert,
              hasNewReport: hasNew,
            ));
          },
          orElse: () {},
        );
      },

      // Attaque envoyée résolue → recharger + badge rapport
      attackResult: (data) async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __, ___) => vid,
          orElse: () => null,
        );
        if (villageId == null) return;
        final movements = await _api.getMovements(villageId);
        emit(MovementsState.loaded(
          villageId:    villageId,
          movements:    movements,
          hasNewReport: true, // Badge sur l'onglet Rapports
        ));
      },

      // Attaque reçue → popup + badge + recharger
      attackIncoming: (data) async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __, ___) => vid,
          orElse: () => null,
        );
        if (villageId == null) return;
        final movements = await _api.getMovements(villageId);
        emit(MovementsState.loaded(
          villageId:     villageId,
          movements:     movements,
          incomingAlert: data,  // Déclenche le popup dans l'UI
          hasNewReport:  true,
        ));
      },

      // Troupes rentrées → recharger
      troopsReturned: (data) async {
        final villageId = state.maybeWhen(
          loaded: (vid, _, __, ___) => vid,
          orElse: () => null,
        );
        if (villageId == null) return;
        final movements = await _api.getMovements(villageId);
        emit(MovementsState.loaded(
          villageId: villageId,
          movements: movements,
        ));
      },
    );
  }

  @override
  Future<void> close() {
    _tickTimer?.cancel();
    return super.close();
  }
}
