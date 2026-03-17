import 'package:flutter/material.dart';
import '../../../data/dto/village_dto.dart';

class BuildingCard extends StatelessWidget {
  final BuildingInstanceDto building;
  final BuildQueueDto? queue;
  final VoidCallback? onUpgrade;

  const BuildingCard({
    super.key,
    required this.building,
    required this.queue,
    this.onUpgrade,
  });

  // Icône par type de bâtiment
  static const Map<String, IconData> _icons = {
    'headquarters': Icons.account_balance,
    'timber_camp':  Icons.forest,
    'quarry':       Icons.terrain,
    'iron_mine':    Icons.hardware,
    'warehouse':    Icons.warehouse,
  };

  // Description courte
  static const Map<String, String> _descriptions = {
    'headquarters': 'Réduit le temps de construction',
    'timber_camp':  'Produit du bois chaque seconde',
    'quarry':       'Produit de la pierre chaque seconde',
    'iron_mine':    'Produit du fer chaque seconde',
    'warehouse':    'Augmente la capacité de stockage',
  };

  bool get _isBeingBuilt => queue?.buildingId == building.buildingId;
  bool get _queueOccupied => queue != null;

  @override
  Widget build(BuildContext context) {
    final icon = _icons[building.buildingId] ?? Icons.home;
    final desc = _descriptions[building.buildingId] ?? '';

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF222222),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isBeingBuilt
              ? Colors.amber.withOpacity(0.7)
              : Colors.white.withOpacity(0.08),
          width: _isBeingBuilt ? 1.5 : 0.5,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── En-tête ──
            Row(
              children: [
                Icon(icon, color: Colors.amber, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    building.displayName,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                _LevelBadge(level: building.level),
              ],
            ),
            const SizedBox(height: 6),

            // ── Description ──
            Text(
              desc,
              style: const TextStyle(color: Colors.white38, fontSize: 11),
              maxLines: 2,
            ),

            const Spacer(),

            // ── Bouton ──
            _UpgradeButton(
              isBeingBuilt: _isBeingBuilt,
              queueOccupied: _queueOccupied,
              onUpgrade: onUpgrade,
            ),
          ],
        ),
      ),
    );
  }
}

class _LevelBadge extends StatelessWidget {
  final int level;
  const _LevelBadge({required this.level});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.amber.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.amber.withOpacity(0.4)),
      ),
      child: Text(
        'Niv. $level',
        style: const TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class _UpgradeButton extends StatelessWidget {
  final bool isBeingBuilt;
  final bool queueOccupied;
  final VoidCallback? onUpgrade;

  const _UpgradeButton({
    required this.isBeingBuilt,
    required this.queueOccupied,
    this.onUpgrade,
  });

  @override
  Widget build(BuildContext context) {
    if (isBeingBuilt) {
      return const SizedBox(
        width: double.infinity,
        child: Center(
          child: Text(
            '⏳ En construction...',
            style: TextStyle(color: Colors.amber, fontSize: 12),
          ),
        ),
      );
    }

    final disabled = queueOccupied;
    return SizedBox(
      width: double.infinity,
      height: 34,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: disabled ? Colors.grey[850] : Colors.amber[800],
          foregroundColor: disabled ? Colors.white38 : Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: EdgeInsets.zero,
        ),
        onPressed: disabled ? null : onUpgrade,
        child: Text(
          disabled ? 'File occupée' : 'Améliorer →',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
