import 'package:flutter/material.dart';
import '../dto/movements_dto.dart';

class MovementTile extends StatelessWidget {
  final MovementDto movement;

  const MovementTile({super.key, required this.movement});

  @override
  Widget build(BuildContext context) {
    final isOutgoing  = movement.isOutgoing;
    final isReturning = movement.isReturning;

    // Couleurs selon la direction et le statut
    Color borderColor;
    Color iconColor;
    IconData icon;
    String label;

    if (isOutgoing && !isReturning) {
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

    final units = isReturning ? (movement.survivors ?? movement.units) : movement.units;
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
                Text(label,
                    style: TextStyle(color: iconColor, fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                // Unités
                Text(
                  units.entries.map((e) => '${_icon(e.key)}${e.value}').join('  '),
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

          // ── Timer ──
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                movement.formattedRemaining,
                style: TextStyle(
                  color: movement.remaining.inSeconds < 10 ? Colors.greenAccent : Colors.white,
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

  String _icon(String unitType) {
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
