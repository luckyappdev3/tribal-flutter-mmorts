import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/injection.dart';
import '../../../core/services/tab_refresh_service.dart';
import '../../../data/remote/api/village_api.dart';
import '../../../data/remote/websocket/socket_service.dart';
import 'construction_event.dart';
import 'construction_state.dart';

class ConstructionBloc extends Bloc<ConstructionEvent, ConstructionState> {
  final VillageApi    _villageApi    = getIt<VillageApi>();
  final SocketService _socketService = getIt<SocketService>();
  Timer? _interpolationTimer;
  StreamSubscription? _tabSub;

  ConstructionBloc() : super(const ConstructionState.initial()) {
    on<ConstructionEvent>(_onEvent);

    _socketService.instance.on('build:finished', (data) {
      add(ConstructionEvent.buildFinished(data is Map<String, dynamic> ? data : {}));
    });

    // Auto-refresh quand l'onglet Construire devient actif
    _tabSub = TabRefreshService.instance.stream.listen((index) {
      if (index == TabIndex.construction) {
        final villageId = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => v);
        if (villageId != null) add(ConstructionEvent.loadRequested(villageId));
      }
    });
  }

  Future<void> _onEvent(ConstructionEvent event, Emitter<ConstructionState> emit) async {
    await event.when(
      loadRequested: (villageId) async {
        emit(const ConstructionState.loading());
        try {
          final results = await Future.wait([
            _villageApi.getBuildings(villageId),
            _villageApi.getVillage(villageId),
          ]);
          final buildings = results[0] as dynamic;
          final village   = results[1] as dynamic;

          emit(ConstructionState.loaded(
            villageId:  villageId,
            buildings:  buildings.buildings,
            queue:      buildings.queue,
            wood:       village.wood,
            stone:      village.stone,
            iron:       village.iron,
            woodRate:   village.productionRates.wood,
            stoneRate:  village.productionRates.stone,
            ironRate:   village.productionRates.iron,
            maxStorage: village.maxStorage,
          ));
          _startInterpolation();
        } catch (e) {
          emit(ConstructionState.error('Chargement impossible : $e'));
        }
      },

      localTick: () {
        state.maybeWhen(
          loaded: (villageId, buildings, queue, wood, stone, iron,
                   woodRate, stoneRate, ironRate, maxStorage) {
            emit(ConstructionState.loaded(
              villageId:  villageId, buildings: buildings, queue: queue,
              wood:       (wood  + woodRate).clamp(0.0, maxStorage).toDouble(),
              stone:      (stone + stoneRate).clamp(0.0, maxStorage).toDouble(),
              iron:       (iron  + ironRate).clamp(0.0, maxStorage).toDouble(),
              woodRate:   woodRate, stoneRate: stoneRate, ironRate: ironRate,
              maxStorage: maxStorage,
            ));
          },
          orElse: () {},
        );
      },

      upgradeRequested: (buildingId) async {
        final villageId  = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => v);
        final queue      = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => q);
        final wood       = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => wo) ?? 0.0;
        final stone      = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => s)  ?? 0.0;
        final iron       = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => i)  ?? 0.0;
        final woodRate   = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => wr) ?? 0.0;
        final stoneRate  = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => sr) ?? 0.0;
        final ironRate   = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => ir) ?? 0.0;
        final maxStorage = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => ms) ?? 5000.0;

        if (villageId == null || queue != null) return;

        emit(ConstructionState.upgrading(
          wood: wood, stone: stone, iron: iron,
          woodRate: woodRate, stoneRate: stoneRate, ironRate: ironRate,
          maxStorage: maxStorage,
        ));

        try {
          await _villageApi.upgrade(villageId, buildingId);
          await _reloadAndEmit(villageId, emit);
          _startInterpolation();
        } catch (e) {
          try {
            await _reloadAndEmit(villageId, emit);
            _startInterpolation();
          } catch (_) {
            emit(ConstructionState.error('Erreur : $e'));
          }
        }
      },

      buildFinished: (data) async {
        final villageId = _getField((v, b, q, wo, s, i, wr, sr, ir, ms) => v);
        if (villageId == null) return;
        await _reloadAndEmit(villageId, emit);
        _startInterpolation();
      },
    );
  }

  Future<void> _reloadAndEmit(String villageId, Emitter<ConstructionState> emit) async {
    final results = await Future.wait([
      _villageApi.getBuildings(villageId),
      _villageApi.getVillage(villageId),
    ]);
    final buildings = results[0] as dynamic;
    final village   = results[1] as dynamic;

    emit(ConstructionState.loaded(
      villageId:  villageId,
      buildings:  buildings.buildings,
      queue:      buildings.queue,
      wood:       village.wood,
      stone:      village.stone,
      iron:       village.iron,
      woodRate:   village.productionRates.wood,
      stoneRate:  village.productionRates.stone,
      ironRate:   village.productionRates.iron,
      maxStorage: village.maxStorage,
    ));
  }

  T? _getField<T>(
    T Function(String, dynamic, dynamic,
               double, double, double,
               double, double, double, double) extractor,
  ) {
    return state.maybeWhen(
      loaded: (villageId, buildings, queue, wood, stone, iron,
               woodRate, stoneRate, ironRate, maxStorage) =>
        extractor(villageId, buildings, queue,
                  wood, stone, iron,
                  woodRate, stoneRate, ironRate, maxStorage),
      orElse: () => null,
    );
  }

  void _startInterpolation() {
    _interpolationTimer?.cancel();
    _interpolationTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => add(const ConstructionEvent.localTick()),
    );
  }

  @override
  Future<void> close() {
    _interpolationTimer?.cancel();
    _tabSub?.cancel();
    return super.close();
  }
}
