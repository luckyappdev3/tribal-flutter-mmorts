import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/village_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import 'construction_event.dart';
import 'construction_state.dart';

class ConstructionBloc extends Bloc<ConstructionEvent, ConstructionState> {
  final VillageApi _villageApi      = getIt<VillageApi>();
  final SocketService _socketService = getIt<SocketService>();

  ConstructionBloc() : super(const ConstructionState.initial()) {
    on<ConstructionEvent>(_onEvent);

    // Quand une construction se termine côté serveur, recharger la liste
    _socketService.instance.on('build:finished', (data) {
      add(ConstructionEvent.buildFinished(
        data is Map<String, dynamic> ? data : {},
      ));
    });
  }

  Future<void> _onEvent(ConstructionEvent event, Emitter<ConstructionState> emit) async {
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
        final current = state;
        current.maybeWhen(
          loaded: (villageId, buildings, queue) async {
            if (queue != null) return; // Construction déjà en cours
            emit(const ConstructionState.upgrading());
            try {
              await _villageApi.upgrade(villageId, buildingId);
              // Recharger pour avoir le nouveau état de la queue
              final dto = await _villageApi.getBuildings(villageId);
              emit(ConstructionState.loaded(
                villageId: villageId,
                buildings: dto.buildings,
                queue:     dto.queue,
              ));
            } catch (e) {
              // Revenir à l'état précédent avec le message d'erreur
              emit(ConstructionState.loaded(
                villageId: villageId,
                buildings: buildings,
                queue:     queue,
              ));
            }
          },
          orElse: () {},
        );
      },

      buildFinished: (data) {
        state.maybeWhen(
          loaded: (villageId, buildings, queue) async {
            // Recharger les données maintenant que le bâtiment est monté en niveau
            final dto = await _villageApi.getBuildings(villageId);
            emit(ConstructionState.loaded(
              villageId: villageId,
              buildings: dto.buildings,
              queue:     null, // La queue est vidée
            ));
          },
          orElse: () {},
        );
      },
    );
  }
}
