import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/village_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import '../../../data/remote/websocket/socket_events.dart';
import 'village_event.dart';
import 'village_state.dart';

class VillageBloc extends Bloc<VillageEvent, VillageState> {
  final VillageApi    _villageApi    = getIt<VillageApi>();
  final SocketService _socketService = getIt<SocketService>();

  Timer? _interpolationTimer;
  Timer? _resyncTimer; // Resync silencieux toutes les 5 minutes

  VillageBloc() : super(const VillageState.initial()) {
    on<VillageEvent>(_onEvent);

    _socketService.instance.on(SocketEvents.buildComplete, (data) {
      state.maybeWhen(
        loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate, maxStorage) {
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
            maxStorage: village.maxStorage,
          ));
          _socketService.joinVillage(villageId);
          _startInterpolation();
          _startResync(villageId);
        } on DioException catch (e) {
          if (e.response?.statusCode == 403) {
            emit(const VillageState.error('VILLAGE_CONQUERED'));
          } else {
            emit(VillageState.error('Impossible de charger le village : $e'));
          }
        } catch (e) {
          emit(VillageState.error('Impossible de charger le village : $e'));
        }
      },

      resourcesUpdated: (data) {
        state.maybeWhen(
          loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate, maxStorage) {
            emit(VillageState.loaded(
              id:         id,
              name:       name,
              wood:       ((data['wood']  as num?)?.toDouble() ?? wood).clamp(0.0, maxStorage).toDouble(),
              stone:      ((data['stone'] as num?)?.toDouble() ?? stone).clamp(0.0, maxStorage).toDouble(),
              iron:       ((data['iron']  as num?)?.toDouble() ?? iron).clamp(0.0, maxStorage).toDouble(),
              woodRate:   woodRate,
              stoneRate:  stoneRate,
              ironRate:   ironRate,
              maxStorage: maxStorage,
            ));
          },
          orElse: () {},
        );
      },

      localTick: () {
        state.maybeWhen(
          loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate, maxStorage) {
            emit(VillageState.loaded(
              id:         id,
              name:       name,
              wood:       (wood  + woodRate).clamp(0.0, maxStorage).toDouble(),
              stone:      (stone + stoneRate).clamp(0.0, maxStorage).toDouble(),
              iron:       (iron  + ironRate).clamp(0.0, maxStorage).toDouble(),
              woodRate:   woodRate,
              stoneRate:  stoneRate,
              ironRate:   ironRate,
              maxStorage: maxStorage,
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

  // Resync silencieux : recharge les vraies valeurs toutes les 5 minutes
  // Corrige la dérive progressive entre interpolation locale et valeurs réelles
  void _startResync(String villageId) {
    _resyncTimer?.cancel();
    _resyncTimer = Timer.periodic(
      const Duration(minutes: 5),
      (_) async {
        try {
          final village = await _villageApi.getVillage(villageId);
          // Émettre directement sans passer par loadRequested (pas de loading state)
          state.maybeWhen(
            loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate, maxStorage) {
              add(VillageEvent.resourcesUpdated({
                'wood':  village.wood,
                'stone': village.stone,
                'iron':  village.iron,
              }));
            },
            orElse: () {},
          );
        } catch (_) {
          // Silencieux — pas grave si le resync échoue
        }
      },
    );
  }

  @override
  Future<void> close() {
    _interpolationTimer?.cancel();
    _resyncTimer?.cancel();
    return super.close();
  }
}
