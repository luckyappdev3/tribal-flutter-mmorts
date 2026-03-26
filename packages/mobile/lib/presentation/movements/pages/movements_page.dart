import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/di/injection.dart';
import '../../../core/resources/global_resources_cubit.dart';
import '../../../core/services/tab_refresh_service.dart';
import '../../../core/utils/app_snack_bar.dart';
import '../../../data/remote/api/troops_api.dart';
import '../../troops/dto/troops_dto.dart';
import '../bloc/movements_bloc.dart';
import '../bloc/movements_event.dart';
import '../bloc/movements_state.dart';
import '../widgets/movement_tile.dart';

class MovementsPage extends StatelessWidget {
  const MovementsPage({super.key});

  @override
  Widget build(BuildContext context) {
    context.watch<GlobalResourcesCubit>();
    final String? villageId = Hive.box('village').get('current_village_id');
    if (villageId == null) {
      return const Scaffold(
        body: Center(child: Text('Village introuvable', style: TextStyle(color: Colors.white))),
      );
    }

    return BlocProvider(
      key: ValueKey(villageId),
      create: (_) => MovementsBloc()..add(MovementsEvent.loadRequested(villageId)),
      child: _MovementsView(villageId: villageId),
    );
  }
}

class _MovementsView extends StatelessWidget {
  final String villageId;
  const _MovementsView({required this.villageId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      body: BlocConsumer<MovementsBloc, MovementsState>(
        listener: (context, state) {},
        builder: (context, state) {
          return state.when(
            initial: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            error:   (msg) => Center(child: Text(msg, style: const TextStyle(color: Colors.red))),
            loaded:  (vid, movements, _, __) => _LoadedBody(
              villageId: vid,
              movements: movements,
            ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
class _LoadedBody extends StatefulWidget {
  final String  villageId;
  final dynamic movements;
  const _LoadedBody({required this.villageId, required this.movements});

  @override
  State<_LoadedBody> createState() => _LoadedBodyState();
}

class _LoadedBodyState extends State<_LoadedBody> {
  final TroopsApi _api = getIt<TroopsApi>();

  List<ActiveSupportDto> _stationed = [];
  List<ActiveSupportDto> _moving    = [];
  StreamSubscription? _tabSub;

  @override
  void initState() {
    super.initState();
    _loadSupports();
    // Recharge à chaque activation de l'onglet Mouvements, comme le BLoC
    _tabSub = TabRefreshService.instance.stream.listen((index) {
      if (index == TabIndex.movements) _loadSupports();
    });
  }

  @override
  void didUpdateWidget(_LoadedBody old) {
    super.didUpdateWidget(old);
    if (old.villageId != widget.villageId) _loadSupports();
  }

  @override
  void dispose() {
    _tabSub?.cancel();
    super.dispose();
  }

  Future<void> _loadSupports() async {
    try {
      final data = await _api.getSupports(widget.villageId);
      final received = (data['received'] as List<dynamic>? ?? [])
          .map((e) => ActiveSupportDto.fromJson(e as Map<String, dynamic>, isSent: false))
          .toList();
      final sent = (data['sent'] as List<dynamic>? ?? [])
          .map((e) => ActiveSupportDto.fromJson(e as Map<String, dynamic>, isSent: true))
          .toList();

      setState(() {
        _stationed = received.where((s) => s.status == 'stationed').toList();
        _moving    = [
          ...sent,
          ...received.where((s) => s.status == 'traveling'),
        ];
      });
    } catch (_) {}
  }

  Future<void> _recall(ActiveSupportDto s) async {
    try {
      await _api.recallSupport(s.fromVillageId, s.id);
      if (mounted) AppSnackBar.success(context, 'Rappel en cours…');
      _loadSupports();
    } catch (e) {
      if (mounted) AppSnackBar.error(context, '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final list      = widget.movements as List;
    final outgoing  = list.where((m) => m.isOutgoing).toList();
    final incoming  = list.where((m) => !m.isOutgoing).toList();

    final hasAnything = _stationed.isNotEmpty ||
        _moving.isNotEmpty ||
        outgoing.isNotEmpty ||
        incoming.isNotEmpty;

    if (!hasAnything) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.directions_run, size: 64, color: Colors.white24),
            SizedBox(height: 16),
            Text('Aucun mouvement en cours',
                style: TextStyle(color: Colors.white54, fontSize: 16)),
            SizedBox(height: 8),
            Text('Lancez une attaque depuis la carte',
                style: TextStyle(color: Colors.white24, fontSize: 13)),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [

        // ── Garnisons stationnées ici (top) ───────────────────
        if (_stationed.isNotEmpty) ...[
          _SectionHeader(
            icon:  Icons.shield,
            label: 'Garnisons ici (${_stationed.length})',
            color: Colors.green,
          ),
          ..._stationed.map((s) => _SupportTile(
            support:          s,
            currentVillageId: widget.villageId,
            onRecall:         null, // on ne peut pas rappeler les troupes des autres
            onTimerComplete:  _loadSupports,
          )),
          const SizedBox(height: 8),
        ],

        // ── Renforts en mouvement ─────────────────────────────
        if (_moving.isNotEmpty) ...[
          _SectionHeader(
            icon:  Icons.shield_outlined,
            label: 'Renforts en mouvement (${_moving.length})',
            color: Colors.lightGreen,
          ),
          ..._moving.map((s) => _SupportTile(
            support:          s,
            currentVillageId: widget.villageId,
            onRecall:         s.fromVillageId == widget.villageId &&
                              s.status != 'returning'
                              ? () => _recall(s)
                              : null,
            onTimerComplete:  _loadSupports,
          )),
          const SizedBox(height: 8),
        ],

        // ── Mes attaques sortantes ────────────────────────────
        if (outgoing.isNotEmpty) ...[
          _SectionHeader(
            icon:  Icons.arrow_upward,
            label: 'Mes attaques (${outgoing.length})',
            color: Colors.red[300]!,
          ),
          ...outgoing.map((m) => MovementTile(movement: m)),
          const SizedBox(height: 8),
        ],

        // ── Attaques entrantes ────────────────────────────────
        if (incoming.isNotEmpty) ...[
          _SectionHeader(
            icon:  Icons.warning_amber,
            label: 'Attaques entrantes (${incoming.length})',
            color: Colors.orange,
          ),
          ...incoming.map((m) => MovementTile(movement: m)),
        ],
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  Tile garnison — même style que MovementTile
// ─────────────────────────────────────────────────────────────
class _SupportTile extends StatefulWidget {
  final ActiveSupportDto support;
  final String           currentVillageId;
  final VoidCallback?    onRecall;
  final VoidCallback?    onTimerComplete;

  const _SupportTile({
    required this.support,
    required this.currentVillageId,
    this.onRecall,
    this.onTimerComplete,
  });

  @override
  State<_SupportTile> createState() => _SupportTileState();
}

class _SupportTileState extends State<_SupportTile> {
  late Timer  _timer;
  late Duration _remaining;
  bool _refreshTriggered = false;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(_updateRemaining);
      if (_remaining == Duration.zero && !_refreshTriggered) {
        _refreshTriggered = true;
        Future.delayed(const Duration(seconds: 3), () {
          if (!mounted) return;
          widget.onTimerComplete?.call();
        });
      }
    });
  }

  void _updateRemaining() {
    final diff = widget.support.arrivesAt.difference(DateTime.now());
    _remaining = diff.isNegative ? Duration.zero : diff;
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _format(Duration d) {
    if (d == Duration.zero) return 'Arrivé';
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final s        = widget.support;
    final isMoving = s.status == 'traveling' || s.status == 'returning';
    final isDone   = _remaining == Duration.zero && isMoving;

    // Couleur / icône selon le sens et le statut
    final Color    iconColor;
    final IconData icon;
    final Color    borderColor;
    final String   label;

    if (s.status == 'stationed') {
      iconColor   = Colors.green;
      icon        = Icons.shield;
      borderColor = Colors.green.withOpacity(0.4);
      label       = 'Renfort de ${s.fromVillageName}';
    } else if (s.fromVillageId == widget.currentVillageId) {
      // Envoyé depuis ce village
      iconColor   = isDone ? Colors.greenAccent : Colors.lightGreen;
      icon        = isDone ? Icons.check_circle_outline : Icons.arrow_upward;
      borderColor = (isDone ? Colors.greenAccent : Colors.lightGreen).withOpacity(0.4);
      label       = s.status == 'returning'
          ? 'Retour ← ${s.toVillageName}'
          : 'Renfort → ${s.toVillageName}';
    } else {
      // Reçu, encore en route
      iconColor   = isDone ? Colors.greenAccent : Colors.green[300]!;
      icon        = isDone ? Icons.check_circle_outline : Icons.arrow_downward;
      borderColor = (isDone ? Colors.greenAccent : Colors.green).withOpacity(0.4);
      label       = 'Renfort entrant ← ${s.fromVillageName}';
    }

    final totalUnits = s.units.values.fold(0, (a, b) => a + b);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:        const Color(0xFF222222),
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          // ── Icône ──────────────────────────────────────────
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(
              color:        iconColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 12),

          // ── Infos ──────────────────────────────────────────
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color:      iconColor,
                    fontWeight: FontWeight.bold,
                    fontSize:   13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  s.units.entries
                      .where((e) => e.value > 0)
                      .map((e) => '${_unitIcon(e.key)}${e.value}')
                      .join('  '),
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
                const SizedBox(height: 2),
                Text(
                  '$totalUnits unité${totalUnits > 1 ? 's' : ''}',
                  style: const TextStyle(color: Colors.white38, fontSize: 10),
                ),
              ],
            ),
          ),

          // ── Timer / statut ──────────────────────────────────
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (s.status == 'stationed')
                const Text('Stationné',
                    style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold))
              else if (isDone)
                const SizedBox(
                  width: 16, height: 16,
                  child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.greenAccent),
                )
              else
                Text(
                  _format(_remaining),
                  style: TextStyle(
                    color:      _remaining.inSeconds < 10 ? Colors.greenAccent : Colors.white,
                    fontSize:   14,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                  ),
                ),
              const SizedBox(height: 2),
              if (s.status != 'stationed')
                Text(
                  s.status == 'returning' ? 'retour' : 'arrivée',
                  style: const TextStyle(color: Colors.white38, fontSize: 10),
                ),
              if (widget.onRecall != null) ...[
                const SizedBox(height: 4),
                GestureDetector(
                  onTap: widget.onRecall,
                  child: const Text('Rappeler',
                      style: TextStyle(color: Colors.red, fontSize: 11,
                          decoration: TextDecoration.underline,
                          decorationColor: Colors.red)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _unitIcon(String unitType) {
    const icons = {
      'spearman':  '🗡️',
      'swordsman': '⚔️',
      'axeman':    '🪓',
      'cavalry':   '🐴',
      'archer':    '🏹',
      'noble':     '👑',
      'scout':     '🔍',
      'ram':       '🪵',
      'catapult':  '💣',
    };
    return icons[unitType] ?? '⚔️';
  }
}

// ─────────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String   label;
  final Color    color;

  const _SectionHeader({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}
