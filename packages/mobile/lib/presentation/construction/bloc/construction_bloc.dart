import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/village_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import 'construction_event.dart';
import 'construction_state.dart';

class ConstructionBloc extends Bloc<ConstructionEvent, ConstructionState> {
  final VillageApi _villageApi       = getIt<VillageApi>();
  final SocketService _socketService = getIt<SocketService>();

  ConstructionBloc() : super(const ConstructionState.initial()) {
    on<ConstructionEvent>(_onEvent);

    _socketService.instance.on('build:finished', (data) {
      add(ConstructionEvent.buildFinished(
        data is Map<String, dynamic> ? data : {},
      ));
    });
  }

  Future<void> _onEvent(
    ConstructionEvent event,
    Emitter<ConstructionState> emit,
  ) async {
    await event.when(
      loadRequested: (villageId) async {
        emit(const ConstructionState.loading());
        try {
          final dto = await _villageApi.getBuildings(villageId);
          emit(ConstructionState.loaded(
            villageId: villageId,
            buildings: dto.buildings,
            queue:     dto.queue,
          ));
        } catch (e) {
          emit(ConstructionState.error('Chargement impossible : $e'));
        }
      },

      upgradeRequested: (buildingId) async {
        // ✅ Extraire les données AVANT tout await
        final villageId = state.maybeWhen(
          loaded: (villageId, buildings, queue) => villageId,
          orElse: () => null,
        );
        final queue = state.maybeWhen(
          loaded: (villageId, buildings, queue) => queue,
          orElse: () => null,
        );
        if (villageId == null || queue != null) return;

        emit(const ConstructionState.upgrading());
        try {
          await _villageApi.upgrade(villageId, buildingId);
          final dto = await _villageApi.getBuildings(villageId);
          emit(ConstructionState.loaded(
            villageId: villageId,
            buildings: dto.buildings,
            queue:     dto.queue,
          ));
        } catch (e) {
          final dto = await _villageApi.getBuildings(villageId);
          emit(ConstructionState.loaded(
            villageId: villageId,
            buildings: dto.buildings,
            queue:     dto.queue,
          ));
        }
      },

      buildFinished: (data) async {
        // ✅ Extraire l'ID AVANT tout await
        final villageId = state.maybeWhen(
          loaded: (villageId, buildings, queue) => villageId,
          orElse: () => null,
        );
        if (villageId == null) return;

        final dto = await _villageApi.getBuildings(villageId);
        emit(ConstructionState.loaded(
          villageId: villageId,
          buildings: dto.buildings,
          queue:     null,
        ));
      },
    );
  }
}