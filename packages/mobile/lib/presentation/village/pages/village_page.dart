import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../bloc/village_bloc.dart';
import '../bloc/village_event.dart';
import '../bloc/village_state.dart';
import '../../../core/router/route_names.dart';

class VillagePage extends StatelessWidget {
  const VillagePage({super.key});

  @override
  Widget build(BuildContext context) {
    final villageBox = Hive.box('village');
    final String? villageId = villageBox.get('current_village_id');

    if (villageId == null || villageId.isEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFF1A1A1A),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              const Text(
                'Aucun village associé à ce compte.',
                style: TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Se reconnecter', style: TextStyle(color: Colors.amber)),
              ),
            ],
          ),
        ),
      );
    }

    return BlocProvider(
      create: (_) => VillageBloc()..add(VillageEvent.loadRequested(villageId)),
      child: const _VillageView(),
    );
  }
}

class _VillageView extends StatelessWidget {
  const _VillageView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: BlocBuilder<VillageBloc, VillageState>(
          builder: (_, state) => Text(
            state.maybeWhen(loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate, maxStorage) => name, orElse: () => 'Mon Royaume'),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.amber),
            onPressed: () {
              final villageId = Hive.box('village').get('current_village_id') as String?;
              if (villageId != null) {
                context.read<VillageBloc>().add(VillageEvent.loadRequested(villageId));
              }
            },
          ),
        ],
      ),
      body: BlocBuilder<VillageBloc, VillageState>(
        builder: (context, state) {
          return state.when(
            initial: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            error:   (msg) => _ErrorView(message: msg),
            loaded: (id, name, wood, stone, iron, woodRate, stoneRate, ironRate, maxStorage) => _LoadedBody(
            id: id, name: name,
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

class _LoadedBody extends StatelessWidget {
  final String id, name;
  final double wood, stone, iron;
  final double woodRate, stoneRate, ironRate;
  final double maxStorage; 

  const _LoadedBody({
    required this.id, required this.name,
    required this.wood, required this.stone, required this.iron,
    required this.woodRate, required this.stoneRate, required this.ironRate,
    required this.maxStorage, 
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── BARRE DES RESSOURCES ──
        Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          decoration: const BoxDecoration(
            color: Colors.black87,
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
            boxShadow: [BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 4))],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _ResourceItem(icon: Icons.forest,  label: 'Bois',   value: wood,  rate: woodRate,  color: const Color(0xFF8D6E63)),
              _ResourceItem(icon: Icons.terrain,  label: 'Pierre', value: stone, rate: stoneRate, color: const Color(0xFF90A4AE)),
              _ResourceItem(icon: Icons.hardware, label: 'Fer',    value: iron,  rate: ironRate,  color: const Color(0xFF78909C)),
            ],
          ),
        ),

        const Spacer(),

        // ── VISUEL VILLAGE ──
        const Icon(Icons.fort, size: 120, color: Colors.amber),
        const SizedBox(height: 12),
        Text(
          name,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1.2),
        ),
        const SizedBox(height: 4),
        Text(
          'ID: $id',
          style: const TextStyle(color: Colors.white24, fontSize: 10),
        ),

        const Spacer(),

        // ── BOUTON CONSTRUCTION ──
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber[900],
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 58),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 6,
            ),
            onPressed: () => context.pushNamed(RouteNames.construction),
            icon: const Icon(Icons.account_balance, size: 26),
            label: const Text('CONSTRUIRE', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, letterSpacing: 1)),
          ),
        ),
      ],
    );
  }
}

class _ResourceItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final double value;
  final double rate;
  final Color color;

  const _ResourceItem({
    required this.icon, required this.label,
    required this.value, required this.rate, required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 26),
        const SizedBox(height: 4),
        Text(
          value.floor().toString(),
          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
        ),
        Text(
          label.toUpperCase(),
          style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600, letterSpacing: 1),
        ),
        const SizedBox(height: 2),
        Text(
          '+${rate.toStringAsFixed(1)}/s',
          style: const TextStyle(color: Colors.white38, fontSize: 9),
        ),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  const _ErrorView({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
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
                if (id != null) context.read<VillageBloc>().add(VillageEvent.loadRequested(id));
              },
              child: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}
