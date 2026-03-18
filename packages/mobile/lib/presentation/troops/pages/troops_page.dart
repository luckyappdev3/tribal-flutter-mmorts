import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../bloc/troops_bloc.dart';
import '../bloc/troops_event.dart';
import '../bloc/troops_state.dart';
import '../widgets/unit_card.dart';
import '../widgets/recruit_timer_widget.dart';

class TroopsPage extends StatelessWidget {
  const TroopsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final String? villageId = Hive.box('village').get('current_village_id');
    if (villageId == null) {
      return const Scaffold(
        body: Center(child: Text('Village introuvable', style: TextStyle(color: Colors.white))),
      );
    }

    return BlocProvider(
      create: (_) => TroopsBloc()..add(TroopsEvent.loadRequested(villageId)),
      child: const _TroopsView(),
    );
  }
}

class _TroopsView extends StatelessWidget {
  const _TroopsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: const Text('Troupes', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.amber),
            onPressed: () {
              final id = Hive.box('village').get('current_village_id') as String?;
              if (id != null) context.read<TroopsBloc>().add(TroopsEvent.loadRequested(id));
            },
          ),
        ],
      ),
      body: BlocConsumer<TroopsBloc, TroopsState>(
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
            initial:    () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading:    () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            recruiting: () => const Center(child: CircularProgressIndicator(color: Colors.green)),
            error:      (msg) => Center(child: Text(msg, style: const TextStyle(color: Colors.red))),
            loaded:     (villageId, troops, queue) => _LoadedBody(
              villageId: villageId,
              troops:    troops,
              queue:     queue,
            ),
          );
        },
      ),
    );
  }
}

class _LoadedBody extends StatelessWidget {
  final String           villageId;
  final dynamic          troops;
  final dynamic          queue;

  const _LoadedBody({required this.villageId, required this.troops, required this.queue});

  // Total des troupes disponibles
  int get _totalTroops => (troops as List).fold<int>(0, (s, t) => s + (t.count as int));

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── Résumé total ──
        Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
          color: Colors.black54,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '⚔️ $_totalTroops troupes disponibles',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              if (queue == null)
                const Text('File libre', style: TextStyle(color: Colors.green, fontSize: 12))
              else
                const Text('File occupée', style: TextStyle(color: Colors.orange, fontSize: 12)),
            ],
          ),
        ),

        // ── Timer recrutement ──
        if (queue != null) RecruitTimerWidget(queue: queue),

        // ── Grille des unités ──
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(14),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount:  2,
              crossAxisSpacing: 12,
              mainAxisSpacing:  12,
              childAspectRatio: 0.72,
            ),
            itemCount: (troops as List).length,
            itemBuilder: (context, index) {
              final troop = troops[index];
              return UnitCard(
                troop: troop,
                queue: queue,
                onRecruit: (unitType, count) => context
                    .read<TroopsBloc>()
                    .add(TroopsEvent.recruitRequested(unitType, count)),
              );
            },
          ),
        ),
      ],
    );
  }
}
