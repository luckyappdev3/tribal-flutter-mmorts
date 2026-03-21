import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
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
      appBar: AppBar(
        title: const Text('Construction',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
      ),
      body: BlocConsumer<ConstructionBloc, ConstructionState>(
        listener: (context, state) {
          state.maybeWhen(
            error: (msg) => ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(msg), backgroundColor: Colors.red),
            ),
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

            // Pendant l'upgrade : spinner + barre de ressources toujours visible
            upgrading: (wood, stone, iron, woodRate, stoneRate, ironRate, maxStorage) =>
                Column(children: [
                  _ResourceBar(
                    wood: wood, stone: stone, iron: iron,
                    woodRate: woodRate, stoneRate: stoneRate, ironRate: ironRate,
                    maxStorage: maxStorage,
                  ),
                  const Expanded(
                    child: Center(
                        child: CircularProgressIndicator(color: Colors.amber)),
                  ),
                ]),

            loaded: (villageId, buildings, queue, queueCount, queueItems,
                     wood, stone, iron,
                     woodRate, stoneRate, ironRate, maxStorage) =>
                _LoadedBody(
                  villageId:  villageId,
                  buildings:  buildings,
                  queue:      queue,
                  queueCount: queueCount,
                  queueItems: queueItems,
                  wood: wood, stone: stone, iron: iron,
                  woodRate: woodRate, stoneRate: stoneRate, ironRate: ironRate,
                  maxStorage: maxStorage,
                ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Barre de ressources — même visuel que VillagePage
// ─────────────────────────────────────────────
class _ResourceBar extends StatelessWidget {
  final double wood, stone, iron;
  final double woodRate, stoneRate, ironRate;
  final double maxStorage;

  const _ResourceBar({
    required this.wood,
    required this.stone,
    required this.iron,
    required this.woodRate,
    required this.stoneRate,
    required this.ironRate,
    required this.maxStorage,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
      decoration: const BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
        boxShadow: [
          BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 4))
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _ResourceItem(
            icon: Icons.forest,
            label: 'Bois',
            value: wood,
            rate: woodRate,
            maxStorage: maxStorage,
            color: const Color(0xFF8D6E63),
          ),
          _ResourceItem(
            icon: Icons.terrain,
            label: 'Pierre',
            value: stone,
            rate: stoneRate,
            maxStorage: maxStorage,
            color: const Color(0xFF90A4AE),
          ),
          _ResourceItem(
            icon: Icons.hardware,
            label: 'Fer',
            value: iron,
            rate: ironRate,
            maxStorage: maxStorage,
            color: const Color(0xFF78909C),
          ),
        ],
      ),
    );
  }
}

// Même widget que dans village_page.dart + indicateur de plafond
class _ResourceItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final double value;
  final double rate;
  final double maxStorage;
  final Color color;

  const _ResourceItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.rate,
    required this.maxStorage,
    required this.color,
  });

  bool get _isFull => value >= maxStorage;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 26),
        const SizedBox(height: 4),
        Text(
          value.floor().toString(),
          style: TextStyle(
            color: _isFull ? Colors.orangeAccent : Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
            fontFamily: 'monospace',
          ),
        ),
        Text(
          label.toUpperCase(),
          style: TextStyle(
            color: color,
            fontSize: 9,
            fontWeight: FontWeight.w600,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          _isFull ? 'PLEIN' : '+${rate.toStringAsFixed(1)}/s',
          style: TextStyle(
            color: _isFull ? Colors.orangeAccent : Colors.white38,
            fontSize: 9,
            fontWeight: _isFull ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}

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
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── Barre des ressources ──
        _ResourceBar(
          wood: wood, stone: stone, iron: iron,
          woodRate: woodRate, stoneRate: stoneRate, ironRate: ironRate,
          maxStorage: maxStorage,
        ),

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
                onUpgrade:  () => context
                    .read<ConstructionBloc>()
                    .add(ConstructionEvent.upgradeRequested(building.buildingId)),
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
