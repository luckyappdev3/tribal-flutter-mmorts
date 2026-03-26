import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../core/services/tab_refresh_service.dart';
import '../../../data/remote/api/map_api.dart';
import 'map_event.dart';
import 'map_state.dart';

class MapBloc extends Bloc<MapEvent, MapState> {
  final MapApi _mapApi = getIt<MapApi>();
  StreamSubscription? _tabSub;

  int _lastX = 20;
  int _lastY = 20;

  MapBloc() : super(const MapState.initial()) {
    on<MapEvent>(_onEvent);

    _tabSub = TabRefreshService.instance.stream.listen((index) {
      if (index == TabIndex.map) {
        add(MapEvent.loadRequested(x: _lastX, y: _lastY));
      }
    });
  }

  Future<void> _onEvent(MapEvent event, Emitter<MapState> emit) async {
    await event.when(
      loadRequested: (x, y) async {
        emit(const MapState.loading());
        _lastX = x;
        _lastY = y;
        try {
          final villages = await _mapApi.getMap(x: x, y: y, radius: 20);
          emit(MapState.loaded(villages: villages, centerX: x, centerY: y));
        } catch (e) {
          emit(MapState.error('Erreur carte : $e'));
        }
      },
      panned: (x, y) async {
        _lastX = x;
        _lastY = y;
        try {
          final villages = await _mapApi.getMap(x: x, y: y, radius: 20);
          emit(MapState.loaded(villages: villages, centerX: x, centerY: y));
        } catch (e) {
          emit(MapState.error('Erreur carte : $e'));
        }
      },
    );
  }

  @override
  Future<void> close() {
    _tabSub?.cancel();
    return super.close();
  }
}