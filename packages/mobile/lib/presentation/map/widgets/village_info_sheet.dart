import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../bloc/map_state.dart';

class VillageInfoSheet extends StatelessWidget {
  final VillageMarker village;
  final String currentPlayerId;

  const VillageInfoSheet({
    super.key,
    required this.village,
    required this.currentPlayerId,
  });

  bool get _isOwn => village.playerId == currentPlayerId;

  static void show(BuildContext context, VillageMarker village, String currentPlayerId) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF222222),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => VillageInfoSheet(
        village:         village,
        currentPlayerId: currentPlayerId,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Poignée ──
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 20),

          // ── Nom + badge ──
          Row(
            children: [
              Icon(Icons.fort, color: _isOwn ? Colors.amber : Colors.red[300], size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(village.name,
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    Text('(${village.x}, ${village.y})',
                        style: const TextStyle(color: Colors.white38, fontSize: 12)),
                  ],
                ),
              ),
              if (_isOwn)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.amber.withOpacity(0.4)),
                  ),
                  child: const Text('Mon village', style: TextStyle(color: Colors.amber, fontSize: 11)),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // ── Infos joueur ──
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(10)),
            child: Row(
              children: [
                const Icon(Icons.person, color: Colors.white54, size: 18),
                const SizedBox(width: 8),
                Text(village.playerName, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                const Spacer(),
                const Icon(Icons.star, color: Colors.amber, size: 14),
                const SizedBox(width: 4),
                Text('${village.totalPoints} pts', style: const TextStyle(color: Colors.amber, fontSize: 13)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── Bouton attaquer ──
          if (!_isOwn)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red[800],
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(context); // Ferme le bottom sheet
                  context.pushNamed(
                    'attack',
                    extra: {
                      'defenderVillageId':   village.id,
                      'defenderName':        village.name,
                      'defenderPlayerName':  village.playerName,
                    },
                  );
                },
                icon: const Icon(Icons.bolt),
                label: const Text('ATTAQUER',
                    style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
              ),
            ),
        ],
      ),
    );
  }
}
