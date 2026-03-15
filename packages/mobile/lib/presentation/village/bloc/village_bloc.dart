import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/websocket/socket_service.dart';
import '../../../data/remote/websocket/socket_events.dart';
import 'village_event.dart';
import 'village_state.dart';

class VillageBloc extends Bloc<VillageEvent, VillageState> {
  final SocketService _socketService = getIt<SocketService>();

  VillageBloc() : super(const VillageState.initial()) {
    on<VillageEvent>((event, emit) async {
      await event.when(
        loadRequested: (villageId) async {
          print("🔍 1. Chargement demandé pour l'ID: $villageId");
          emit(const VillageState.loading());
          
          // C'est ici que l'ID doit être correct (ex: 64167be1...)
          _socketService.joinVillage(villageId);

          emit(VillageState.loaded(
            id: villageId, 
            name: "Village de Yildirim",
            wood: 500, 
            stone: 250,
            iron: 100,
          ));
          print("✅ 2. Village chargé en local avec l'ID: $villageId");
        },
        resourcesUpdated: (data) {
          print("⚡ 3. Tentative de mise à jour du Bloc avec: $data");
          
          state.maybeWhen(
            loaded: (id, name, wood, stone, iron) {
              print("🎯 4. Mise à jour appliquée au village: $id");
              emit(VillageState.loaded(
                id: id,
                name: name,
                wood: (data['wood'] as num?)?.round() ?? wood,
                stone: (data['stone'] as num?)?.round() ?? stone,
                iron: (data['iron'] as num?)?.round() ?? iron,
              ));
            },
            orElse: () {
              print("❌ 5. Bloc non prêt. État actuel: ${state.runtimeType}");
            },
          );
        },
      );
    });

    // Écouteur Socket
    _socketService.instance.on(SocketEvents.resourcesUpdate, (data) {
      print("📩 6. SOCKET REÇU : $data");
      add(VillageEvent.resourcesUpdated(data));
    });
  }
}