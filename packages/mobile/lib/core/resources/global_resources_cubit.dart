import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../di/injection.dart';
import '../services/tab_refresh_service.dart';
import '../../data/remote/api/village_api.dart';
import '../../data/remote/websocket/socket_service.dart';

// ── State ────────────────────────────────────────────────────────
class GlobalResourcesState {
  final bool   isLoaded;
  final double wood, stone, iron;
  final double woodRate, stoneRate, ironRate;
  final double maxStorage;
  final int    popUsed, popMax;

  const GlobalResourcesState({
    this.isLoaded   = false,
    this.wood       = 0,
    this.stone      = 0,
    this.iron       = 0,
    this.woodRate   = 0,
    this.stoneRate  = 0,
    this.ironRate   = 0,
    this.maxStorage = 5000,
    this.popUsed    = 0,
    this.popMax     = 0,
  });

  GlobalResourcesState copyWith({
    bool?   isLoaded,
    double? wood, double? stone, double? iron,
    double? woodRate, double? stoneRate, double? ironRate,
    double? maxStorage,
    int?    popUsed, int? popMax,
  }) => GlobalResourcesState(
    isLoaded:   isLoaded   ?? this.isLoaded,
    wood:       wood       ?? this.wood,
    stone:      stone      ?? this.stone,
    iron:       iron       ?? this.iron,
    woodRate:   woodRate   ?? this.woodRate,
    stoneRate:  stoneRate  ?? this.stoneRate,
    ironRate:   ironRate   ?? this.ironRate,
    maxStorage: maxStorage ?? this.maxStorage,
    popUsed:    popUsed    ?? this.popUsed,
    popMax:     popMax     ?? this.popMax,
  );
}

// ── Cubit ────────────────────────────────────────────────────────
class GlobalResourcesCubit extends Cubit<GlobalResourcesState> {
  final VillageApi    _api    = getIt<VillageApi>();
  final SocketService _socket = getIt<SocketService>();

  Timer? _tick;
  Timer? _resync;
  StreamSubscription? _tabSub;
  String? _villageId;

  GlobalResourcesCubit() : super(const GlobalResourcesState()) {
    final id = Hive.box('village').get('current_village_id') as String?;
    if (id != null && id.isNotEmpty) {
      _villageId = id;
      _load(id);
    }

    // Recharge à chaque changement d'onglet
    _tabSub = TabRefreshService.instance.stream.listen((_) {
      final vid = Hive.box('village').get('current_village_id') as String?;
      if (vid != null && vid.isNotEmpty) {
        _villageId = vid;
        _load(vid);
      }
    });

    // Recharge après fin de construction (pop change)
    _socket.instance.on('build:finished', (_) {
      if (_villageId != null) _load(_villageId!);
    });

    // Recharge après recrutement (pop change)
    _socket.instance.on('troops:unit_ready', (_) {
      if (_villageId != null) _load(_villageId!);
    });
  }

  Future<void> reload() async {
    final id = _villageId ?? Hive.box('village').get('current_village_id') as String?;
    if (id != null && id.isNotEmpty) {
      _villageId = id;
      await _load(id);
    }
  }

  Future<void> _load(String villageId) async {
    try {
      final results = await Future.wait([
        _api.getVillage(villageId),
        _api.getBuildings(villageId),
      ]);
      final village   = results[0] as dynamic;
      final buildings = results[1] as dynamic;

      emit(GlobalResourcesState(
        isLoaded:   true,
        wood:       village.wood       as double,
        stone:      village.stone      as double,
        iron:       village.iron       as double,
        woodRate:   village.productionRates.wood   as double,
        stoneRate:  village.productionRates.stone  as double,
        ironRate:   village.productionRates.iron   as double,
        maxStorage: village.maxStorage as double,
        popUsed:    buildings.popUsed  as int,
        popMax:     buildings.popMax   as int,
      ));
      _startTick();
      _startResync(villageId);
    } catch (_) {
      // Silencieux — la barre garde ses anciennes valeurs
    }
  }

  void _startTick() {
    _tick?.cancel();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!state.isLoaded) return;
      final s = state;
      emit(s.copyWith(
        wood:  (s.wood  + s.woodRate ).clamp(0.0, s.maxStorage),
        stone: (s.stone + s.stoneRate).clamp(0.0, s.maxStorage),
        iron:  (s.iron  + s.ironRate ).clamp(0.0, s.maxStorage),
      ));
    });
  }

  void _startResync(String villageId) {
    _resync?.cancel();
    _resync = Timer.periodic(const Duration(minutes: 5), (_) => _load(villageId));
  }

  @override
  Future<void> close() {
    _tick?.cancel();
    _resync?.cancel();
    _tabSub?.cancel();
    return super.close();
  }
}
