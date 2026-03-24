import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../dto/movements_dto.dart';
import '../bloc/movements_bloc.dart';
import '../bloc/movements_event.dart';

// ─────────────────────────────────────────────────────────────
//  MovementTile — StatefulWidget avec timer interne.
//  - Le timer tourne toutes les secondes indépendamment du Bloc.
//  - Quand arrivesAt est atteint, déclenche un refresh automatique
//    après 3s (laisse le temps au serveur de finaliser).
// ─────────────────────────────────────────────────────────────

class MovementTile extends StatefulWidget {
  final MovementDto movement;

  const MovementTile({super.key, required this.movement});

  @override
  State<MovementTile> createState() => _MovementTileState();
}

class _MovementTileState extends State<MovementTile> {
  late Timer _timer;
  late Duration _remaining;
  bool _refreshTriggered = false;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(_updateRemaining);

      // Quand le timer atteint zéro, rafraîchir la liste après 3s
      if (_remaining == Duration.zero && !_refreshTriggered) {
        _refreshTriggered = true;
        Future.delayed(const Duration(seconds: 3), () {
          if (!mounted) return;
          context
              .read<MovementsBloc>()
              .add(const MovementsEvent.refreshRequested());
        });
      }
    });
  }

  void _updateRemaining() {
    final diff = widget.movement.arrivesAt.difference(DateTime.now());
    _remaining = diff.isNegative ? Duration.zero : diff;
  }

  @override
  void didUpdateWidget(MovementTile old) {
    super.didUpdateWidget(old);
    if (old.movement.id != widget.movement.id ||
        old.movement.arrivesAt != widget.movement.arrivesAt) {
      _refreshTriggered = false;
      _updateRemaining();
    }
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
    final movement    = widget.movement;
    final isOutgoing  = movement.isOutgoing;
    final isReturning = movement.isReturning;
    final isDone      = _remaining == Duration.zero;

    Color borderColor;
    Color iconColor;
    IconData icon;
    String label;

    if (isDone) {
      borderColor = Colors.green.withOpacity(0.4);
      iconColor   = Colors.greenAccent;
      icon        = Icons.check_circle_outline;
      label       = isReturning
          ? 'Retour terminé !'
          : 'Combat en cours...';
    } else if (isOutgoing && !isReturning) {
      borderColor = Colors.red.withOpacity(0.5);
      iconColor   = Colors.red[300]!;
      icon        = Icons.arrow_upward;
      label       = 'Attaque → ${movement.defenderVillage.name}';
    } else if (isOutgoing && isReturning) {
      borderColor = Colors.green.withOpacity(0.5);
      iconColor   = Colors.greenAccent;
      icon        = Icons.arrow_downward;
      label       = 'Retour ← ${movement.defenderVillage.name}';
    } else {
      borderColor = Colors.orange.withOpacity(0.5);
      iconColor   = Colors.orange;
      icon        = Icons.warning_amber;
      label       = 'Attaque entrante ← ${movement.attackerVillage.name}';
    }

    final units      = isReturning ? (movement.survivors ?? movement.units) : movement.units;
    final totalUnits = units.values.fold(0, (s, c) => s + c);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF222222),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          // ── Icône ──
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 12),

          // ── Infos ──
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: iconColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                if (isOutgoing) ...[
                  Text(
                    units.entries.map((e) => '${_unitIcon(e.key)}${e.value}').join('  '),
                    style: const TextStyle(color: Colors.white54, fontSize: 11),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$totalUnits unité${totalUnits > 1 ? 's' : ''}',
                    style: const TextStyle(color: Colors.white38, fontSize: 10),
                  ),
                ],
              ],
            ),
          ),

          // ── Timer ──
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              isDone
                  ? const SizedBox(
                      width: 16, height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 1.5,
                        color: Colors.greenAccent,
                      ),
                    )
                  : Text(
                      _format(_remaining),
                      style: TextStyle(
                        color: _remaining.inSeconds < 10
                            ? Colors.greenAccent
                            : Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
              const SizedBox(height: 2),
              Text(
                isReturning ? 'retour' : 'arrivée',
                style: const TextStyle(color: Colors.white38, fontSize: 10),
              ),
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
    };
    return icons[unitType] ?? '⚔️';
  }
}
