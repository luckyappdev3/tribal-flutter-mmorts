import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/village_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import '../../../data/remote/websocket/socket_events.dart';
import 'village_event.dart';
import 'village_state.dart';

class VillageBloc extends Bloc<VillageEvent, VillageState> {
  final VillageApi _villageApi = getIt<VillageApi>();
  final SocketService _socketService = getIt<SocketService>();
  Timer? _interpolationTimer;

  VillageBloc() : super(const VillageState.initial()) {
    on<VillageEvent>(_onEvent);

    // Écoute des mises à jour WebSocket (build:finished)
    _socketService.instance.on(SocketEvents.buildComplete, (data) {
      // Recharge le village pour avoir les nouveaux niveaux de bâtiments
      state.maybeWhen(
        loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate) {
          add(VillageEvent.loadRequested(id));
        },
        orElse: () {},
      );
    });
  }

  Future<void> _onEvent(VillageEvent event, Emitter<VillageState> emit) async {
    await event.when(
      loadRequested: (villageId) async {
        emit(const VillageState.loading());
        try {
          final village = await _villageApi.getVillage(villageId);

          emit(VillageState.loaded(
            id:         village.id,
            name:       village.name,
            wood:       village.wood,
            stone:      village.stone,
            iron:       village.iron,
            woodRate:   village.productionRates.wood,
            stoneRate:  village.productionRates.stone,
            ironRate:   village.productionRates.iron,
          ));

          _socketService.joinVillage(villageId);
          _startInterpolation();
        } catch (e) {
          emit(VillageState.error('Impossible de charger le village : $e'));
        }
      },

      // Mise à jour delta depuis WebSocket (resources:update)
      resourcesUpdated: (data) {
        state.maybeWhen(
          loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate) {
            emit(VillageState.loaded(
              id:        id,
              name:      name,
              wood:      (data['wood']  as num?)?.toDouble() ?? wood,
              stone:     (data['stone'] as num?)?.toDouble() ?? stone,
              iron:      (data['iron']  as num?)?.toDouble() ?? iron,
              woodRate:  woodRate,
              stoneRate: stoneRate,
              ironRate:  ironRate,
            ));
          },
          orElse: () {},
        );
      },

      // Tick local toutes les secondes : incrémente les ressources visuellement
      localTick: () {
        state.maybeWhen(
          loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate) {
            emit(VillageState.loaded(
              id:        id,
              name:      name,
              wood:      wood  + woodRate,
              stone:     stone + stoneRate,
              iron:      iron  + ironRate,
              woodRate:  woodRate,
              stoneRate: stoneRate,
              ironRate:  ironRate,
            ));
          },
          orElse: () {},
        );
      },
    );
  }

  void _startInterpolation() {
    _interpolationTimer?.cancel();
    _interpolationTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => add(const VillageEvent.localTick()),
    );
  }

  @override
  Future<void> close() {
    _interpolationTimer?.cancel();
    return super.close();
  }
}
