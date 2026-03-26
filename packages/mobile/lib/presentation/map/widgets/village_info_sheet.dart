import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../bloc/map_state.dart';
import '../../attack/pages/support_page.dart';

class VillageInfoSheet extends StatelessWidget {
  final VillageMarker village;
  final String        currentPlayerId;

  const VillageInfoSheet({
    super.key,
    required this.village,
    required this.currentPlayerId,
  });

  bool get _isOwn       => village.playerId == currentPlayerId;
  bool get _isAbandoned => village.isAbandoned;

  static void show(BuildContext context, VillageMarker village, String currentPlayerId) {
    showModalBottomSheet(
      context:           context,
      backgroundColor:   const Color(0xFF222222),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => VillageInfoSheet(
        village:          village,
        currentPlayerId:  currentPlayerId,
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

          // ── En-tête ──
          Row(
            children: [
              Icon(
                _isAbandoned ? Icons.holiday_village : Icons.fort,
                color: _isAbandoned
                    ? Colors.grey[400]
                    : (_isOwn ? Colors.amber : Colors.red[300]),
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isAbandoned ? 'Village Abandonné' : village.name,
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '(${village.x}, ${village.y})',
                      style: const TextStyle(color: Colors.white38, fontSize: 12),
                    ),
                  ],
                ),
              ),
              // Badge niveau pour les abandonnés, badge "Moi" pour ses propres villages
              if (_isAbandoned)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.withOpacity(0.4)),
                  ),
                  child: Text(
                    'Niv. ${village.abandonedLevel}',
                    style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                )
              else if (_isOwn)
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

          // ── Infos ──
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(10)),
            child: _isAbandoned
                ? Row(
                    children: [
                      const Icon(Icons.info_outline, color: Colors.grey, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Village abandonné niveau ${village.abandonedLevel}. '
                          'Aucun défenseur — pillez librement !',
                          style: const TextStyle(color: Colors.white54, fontSize: 13),
                        ),
                      ),
                    ],
                  )
                : Row(
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
          // ── Barre de loyauté (visible uniquement pour ses propres villages) ──
          if (_isOwn && village.loyaltyPoints != null) ...[
            const SizedBox(height: 4),
            _LoyaltyBar(loyalty: village.loyaltyPoints!),
          ],
          const SizedBox(height: 20),

          // ── Bouton Renforcer (village allié différent du village courant) ──
          if (_isOwn) ...[
            Builder(builder: (ctx) {
              final currentId = Hive.box('village').get('current_village_id') as String?;
              if (currentId == village.id) return const SizedBox.shrink();
              return SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green[800],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => SupportPage(
                          targetVillageId:   village.id,
                          targetVillageName: village.name,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.shield),
                  label: const Text('RENFORCER',
                      style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
                ),
              );
            }),
          ],

          // ── Bouton Attaquer (villages ennemis et abandonnés) ──
          if (!_isOwn)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isAbandoned ? Colors.grey[700] : Colors.red[800],
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(context);
                  context.pushNamed(
                    'attack',
                    extra: {
                      'defenderVillageId':  village.id,
                      'defenderName':       _isAbandoned
                          ? 'Village Abandonné Niv.${village.abandonedLevel}'
                          : village.name,
                      'defenderPlayerName': _isAbandoned ? 'Abandonné' : village.playerName,
                    },
                  );
                },
                icon: Icon(_isAbandoned ? Icons.local_fire_department : Icons.bolt),
                label: Text(
                  _isAbandoned ? 'PILLER' : 'ATTAQUER',
                  style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Barre de loyauté ─────────────────────────────────────────────
class _LoyaltyBar extends StatelessWidget {
  final int loyalty;
  const _LoyaltyBar({required this.loyalty});

  Color get _color {
    if (loyalty > 60) return Colors.green;
    if (loyalty > 30) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black26,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('⚜️ Loyauté', style: TextStyle(color: Colors.white54, fontSize: 12)),
              Text('$loyalty / 100',
                  style: TextStyle(color: _color, fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: loyalty / 100,
              backgroundColor: Colors.white12,
              color: _color,
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}
