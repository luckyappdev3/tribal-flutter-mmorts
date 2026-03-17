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
        body: Center(child: Text('Village introuvable', style: TextStyle(color: Colors.white))),
      );
    }

    return BlocProvider(
      create: (_) => ConstructionBloc()..add(ConstructionEvent.loadRequested(villageId)),
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
        title: const Text('Construction', style: TextStyle(fontWeight: FontWeight.bold)),
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
            initial:   () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading:   () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            upgrading: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            error:     (msg) => _ErrorBody(message: msg),
            loaded:    (villageId, buildings, queue) => _LoadedBody(
              villageId: villageId,
              buildings: buildings,
              queue: queue,
            ),
          );
        },
      ),
    );
  }
}

class _LoadedBody extends StatelessWidget {
  final String villageId;
  final buildings;
  final queue;

  const _LoadedBody({
    required this.villageId,
    required this.buildings,
    required this.queue,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Timer si construction en cours
        if (queue != null) BuildTimerWidget(queue: queue),

        // Explication file unique
        if (queue == null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.white38, size: 14),
                const SizedBox(width: 6),
                const Text(
                  'Une seule construction à la fois',
                  style: TextStyle(color: Colors.white38, fontSize: 12),
                ),
              ],
            ),
          ),

        // Grille des bâtiments
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.1,
            ),
            itemCount: buildings.length,
            itemBuilder: (context, index) {
              final building = buildings[index];
              return BuildingCard(
                building: building,
                queue: queue,
                onUpgrade: () => context
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
          Text(message, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              final id = Hive.box('village').get('current_village_id') as String?;
              if (id != null) {
                context.read<ConstructionBloc>().add(ConstructionEvent.loadRequested(id));
              }
            },
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }
}
