import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/utils/app_snack_bar.dart';
import '../bloc/construction_bloc.dart';
import '../bloc/construction_event.dart';
import '../bloc/construction_state.dart';
import '../widgets/building_card.dart';
import '../widgets/build_timer_widget.dart';

class ConstructionPage extends StatelessWidget {
  const ConstructionPage({super.key});

  @override
  Widget build(BuildContext context) {
    final String? villageId = Hive.box('village').get('current_village_id');

    if (villageId == null) {
      return const Scaffold(
        body: Center(
          child: Text('Village introuvable', style: TextStyle(color: Colors.white)),
        ),
      );
    }

    return BlocProvider(
      create: (_) => ConstructionBloc()
        ..add(ConstructionEvent.loadRequested(villageId)),
      child: const _ConstructionView(),
    );
  }
}

class _ConstructionView extends StatelessWidget {
  const _ConstructionView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      body: BlocConsumer<ConstructionBloc, ConstructionState>(
        listener: (context, state) {
          state.maybeWhen(
            error: (msg) => AppSnackBar.error(context, msg),
            orElse: () {},
          );
        },
        builder: (context, state) {
          return state.when(
            initial: () =>
                const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading: () =>
                const Center(child: CircularProgressIndicator(color: Colors.amber)),
            error: (msg) => _ErrorBody(message: msg),

            upgrading: (wood, stone, iron, woodRate, stoneRate, ironRate, maxStorage, popUsed, popMax) =>
                const Center(child: CircularProgressIndicator(color: Colors.amber)),

            loaded: (villageId, buildings, queue, queueCount, queueItems,
                     wood, stone, iron,
                     woodRate, stoneRate, ironRate, maxStorage,
                     popUsed, popMax) =>
                _LoadedBody(
                  villageId:  villageId,
                  buildings:  buildings,
                  queue:      queue,
                  queueCount: queueCount,
                  queueItems: queueItems,
                  wood: wood, stone: stone, iron: iron,
                  woodRate: woodRate, stoneRate: stoneRate, ironRate: ironRate,
                  maxStorage: maxStorage,
                  popUsed: popUsed,
                  popMax:  popMax,
                ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Corps principal
// ─────────────────────────────────────────────
class _LoadedBody extends StatelessWidget {
  final String villageId;
  final dynamic buildings;
  final dynamic queue;
  final int queueCount;
  final List<dynamic> queueItems;
  final double wood, stone, iron;
  final double woodRate, stoneRate, ironRate;
  final double maxStorage;
  final int popUsed;
  final int popMax;

  const _LoadedBody({
    required this.villageId,
    required this.buildings,
    required this.queue,
    required this.queueCount,
    required this.queueItems,
    required this.wood,
    required this.stone,
    required this.iron,
    required this.woodRate,
    required this.stoneRate,
    required this.ironRate,
    required this.maxStorage,
    required this.popUsed,
    required this.popMax,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── File de construction complète (tous les slots) ──
        ...queueItems.map((item) => BuildTimerWidget(
          queue: item,
          isActive: item.position == 0,
        )),

        // ── Info si file vide ──
        if (queueCount == 0)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 2),
            child: Row(
              children: const [
                Icon(Icons.info_outline, color: Colors.white38, size: 13),
                SizedBox(width: 6),
                Text(
                  'Une seule construction à la fois',
                  style: TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),

        // ── Grille des bâtiments ──
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(14),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.95,
            ),
            itemCount: buildings.length,
            itemBuilder: (context, index) {
              final building = buildings[index];
              return BuildingCard(
                building:   building,
                queue:      queue,
                queueCount: queueCount,
                onUpgrade: () {
                  final needed  = (building.nextLevelPopCost ?? 0) as int;
                  final popFree = popMax - popUsed;
                  if (needed > 0 && popFree < needed) {
                    AppSnackBar.error(context, 'Population insuffisante');
                    return;
                  }
                  context
                      .read<ConstructionBloc>()
                      .add(ConstructionEvent.upgradeRequested(building.buildingId));
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────
// Écran d'erreur
// ─────────────────────────────────────────────
class _ErrorBody extends StatelessWidget {
  final String message;
  const _ErrorBody({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 16),
          Text(message,
              style: const TextStyle(color: Colors.red),
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              final id =
                  Hive.box('village').get('current_village_id') as String?;
              if (id != null) {
                context
                    .read<ConstructionBloc>()
                    .add(ConstructionEvent.loadRequested(id));
              }
            },
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }
}
