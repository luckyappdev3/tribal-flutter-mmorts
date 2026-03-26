import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/di/injection.dart';
import '../../../core/resources/global_resources_cubit.dart';
import '../../../core/utils/app_snack_bar.dart';
import '../../../data/remote/api/troops_api.dart';
import '../bloc/troops_bloc.dart';
import '../bloc/troops_event.dart';
import '../bloc/troops_state.dart';
import '../dto/troops_dto.dart';
import '../widgets/unit_card.dart';
import '../widgets/recruit_queue_section.dart';
import '../../../core/widgets/countdown_timer.dart';

class TroopsPage extends StatelessWidget {
  const TroopsPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Rebuilds quand le village change → recrée le BLoC avec le bon villageId
    context.watch<GlobalResourcesCubit>();
    final String? villageId = Hive.box('village').get('current_village_id');
    if (villageId == null) {
      return const Scaffold(
        body: Center(child: Text('Village introuvable', style: TextStyle(color: Colors.white))),
      );
    }
    return BlocProvider(
      key: ValueKey(villageId),
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

        // ── Grille + Garnison dans un seul scroll ─────────────
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(14),
            children: [
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
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
            ],
          ),
        ),
      ],
    );
  }
}

// ── Section garnison ──────────────────────────────────────────
class _GarrisonSection extends StatefulWidget {
  final String villageId;
  const _GarrisonSection({required this.villageId});

  @override
  State<_GarrisonSection> createState() => _GarrisonSectionState();
}

class _GarrisonSectionState extends State<_GarrisonSection> {
  final TroopsApi _api = getIt<TroopsApi>();
  List<ActiveSupportDto> _sent     = [];
  List<ActiveSupportDto> _received = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.getSupports(widget.villageId);
      final sentList     = (data['sent']     as List<dynamic>? ?? []);
      final receivedList = (data['received'] as List<dynamic>? ?? []);
      setState(() {
        _sent     = sentList.map((e) => ActiveSupportDto.fromJson(e as Map<String, dynamic>, isSent: true)).toList();
        _received = receivedList.map((e) => ActiveSupportDto.fromJson(e as Map<String, dynamic>, isSent: false)).toList();
        _loading  = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _recall(ActiveSupportDto s) async {
    try {
      await _api.recallSupport(s.fromVillageId, s.id);
      if (mounted) AppSnackBar.success(context, 'Rappel en cours…');
      _load();
    } catch (e) {
      if (mounted) AppSnackBar.error(context, '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox.shrink();
    if (_sent.isEmpty && _received.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(color: Colors.white12),
        const Padding(
          padding: EdgeInsets.only(bottom: 10),
          child: Text('🛡️ Garnisons', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold)),
        ),

        // Renforts reçus (stationnés ici)
        if (_received.isNotEmpty) ...[
          const Text('Reçus', style: TextStyle(color: Colors.white38, fontSize: 12)),
          const SizedBox(height: 6),
          ..._received.map((s) => _SupportRow(
            support:         s,
            label:           'De ${s.fromVillageName}',
            icon:            Icons.arrow_downward,
            iconColor:       Colors.green,
            canRecall:       false,
            onTimerComplete: _load,
          )),
          const SizedBox(height: 10),
        ],

        // Renforts envoyés (en route ou stationnés ailleurs)
        if (_sent.isNotEmpty) ...[
          const Text('Envoyés', style: TextStyle(color: Colors.white38, fontSize: 12)),
          const SizedBox(height: 6),
          ..._sent.map((s) => _SupportRow(
            support:         s,
            label:           'Vers ${s.toVillageName}',
            icon:            Icons.arrow_upward,
            iconColor:       Colors.amber,
            canRecall:       s.status != 'returning',
            onRecall:        () => _recall(s),
            onTimerComplete: _load,
          )),
        ],
      ],
    );
  }
}

class _SupportRow extends StatelessWidget {
  final ActiveSupportDto support;
  final String           label;
  final IconData         icon;
  final Color            iconColor;
  final bool             canRecall;
  final VoidCallback?    onRecall;
  final VoidCallback?    onTimerComplete;

  const _SupportRow({
    required this.support,
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.canRecall,
    this.onRecall,
    this.onTimerComplete,
  });

  bool get _isMoving =>
      support.status == 'traveling' || support.status == 'returning';

  @override
  Widget build(BuildContext context) {
    final unitSummary = support.units.entries
        .where((e) => e.value > 0)
        .map((e) => '${e.value} ${e.key}')
        .join(', ');

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF222222),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: iconColor.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.bold)),
                Text(unitSummary,
                    style: const TextStyle(
                        color: Colors.white54, fontSize: 11)),
                const SizedBox(height: 2),
                if (_isMoving)
                  Row(
                    children: [
                      Icon(
                        support.status == 'traveling'
                            ? Icons.arrow_forward
                            : Icons.arrow_back,
                        color: iconColor,
                        size: 11,
                      ),
                      const SizedBox(width: 3),
                      CountdownTimer(
                        endsAt:        support.arrivesAt,
                        onComplete:    onTimerComplete,
                        completedText: 'Arrivée…',
                        style: TextStyle(
                          color:      iconColor,
                          fontSize:   12,
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                        ),
                        completedStyle: const TextStyle(
                          color:      Colors.greenAccent,
                          fontSize:   12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  )
                else
                  Text('Stationné',
                      style: TextStyle(color: iconColor, fontSize: 11)),
              ],
            ),
          ),
          if (canRecall)
            TextButton(
              onPressed: onRecall,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(40, 30),
              ),
              child: const Text('Rappeler',
                  style: TextStyle(color: Colors.red, fontSize: 12)),
            ),
        ],
      ),
    );
  }
}

