import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/map_api.dart';
import 'map_event.dart';
import 'map_state.dart';

class MapBloc extends Bloc<MapEvent, MapState> {
  final MapApi _mapApi = getIt<MapApi>();

  MapBloc() : super(const MapState.initial()) {
    on<MapEvent>(_onEvent);
  }

  Future<void> _onEvent(MapEvent event, Emitter<MapState> emit) async {
    await event.when(
      loadRequested: (x, y) async {
        emit(const MapState.loading());
        try {
          final villages = await _mapApi.getMap(x: x, y: y);
          emit(MapState.loaded(villages: villages, centerX: x, centerY: y));
        } catch (e) {
          emit(MapState.error('Impossible de charger la carte : $e'));
        }
      },

      panned: (x, y) async {
        // Charger un nouveau chunk sans passer par loading (évite le flash)
        try {
          final villages = await _mapApi.getMap(x: x, y: y);
          emit(MapState.loaded(villages: villages, centerX: x, centerY: y));
        } catch (_) {
          // Si le pan échoue on garde l'état actuel
        }
      },
    );
  }
}
