import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/utils/app_snack_bar.dart';
import '../bloc/troops_bloc.dart';
import '../bloc/troops_event.dart';
import '../bloc/troops_state.dart';
import '../dto/troops_dto.dart';
import '../widgets/unit_card.dart';
import '../widgets/recruit_queue_section.dart';

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
      body: BlocConsumer<TroopsBloc, TroopsState>(
        listener: (context, state) {
          state.maybeWhen(
            error: (msg) => AppSnackBar.error(context, msg),
            orElse: () {},
          );
        },
        builder: (context, state) {
          return state.when(
            initial:    () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading:    () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            recruiting: () => const Center(child: CircularProgressIndicator(color: Colors.green)),
            error:      (_) => const Center(child: CircularProgressIndicator(color: Colors.red)),
            loaded:     (villageId, troops, queues, population) => _LoadedBody(
              villageId:  villageId,
              troops:     troops,
              queues:     queues,
              population: population,
            ),
          );
        },
      ),
    );
  }
}

class _LoadedBody extends StatelessWidget {
  final String                villageId;
  final List<TroopDto>        troops;
  final List<RecruitQueueDto> queues;
  final PopulationDto?        population;

  const _LoadedBody({
    required this.villageId,
    required this.troops,
    required this.queues,
    this.population,
  });

  int get _totalTroops => troops.fold<int>(0, (s, t) => s + t.count);

  // Files actives groupées par bâtiment (première entrée de chaque file = en cours)
  List<RecruitQueueDto> get _activeQueues {
    final seen = <String>{};
    return queues.where((q) => seen.add(q.buildingType)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final activeQueues = _activeQueues;

    return Column(
      children: [
        // ── Résumé + Population ──────────────────────────────
        Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          color: Colors.black54,
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '⚔️ $_totalTroops troupes disponibles',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  Text(
                    activeQueues.isEmpty
                        ? 'Files libres'
                        : '${activeQueues.length} file(s) active(s)',
                    style: TextStyle(
                      color: activeQueues.isEmpty ? Colors.green : Colors.orange,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),

            ],
          ),
        ),

        // ── Section de recrutement (files parallèles) ────────
        if (queues.isNotEmpty)
          RecruitQueueSection(
            queues:   queues,
            troops:   troops,
            onCancel: (queueId) => context
                .read<TroopsBloc>()
                .add(TroopsEvent.cancelRequested(queueId)),
          ),

        // ── Grille des unités ─────────────────────────────────
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(14),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount:   2,
              crossAxisSpacing: 12,
              mainAxisSpacing:  12,
              childAspectRatio: 0.68,
            ),
            itemCount: troops.length,
            itemBuilder: (context, index) {
              final troop = troops[index];
              return UnitCard(
                troop:      troop,
                queues:     queues,
                population: population,
                onRecruit:  (unitType, count) => context
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

