import 'package:flutter/material.dart';
import '../../../data/dto/village_dto.dart';


class BuildingCard extends StatelessWidget {
  final BuildingInstanceDto building;
  final BuildQueueDto?      queue;
  final int                 queueCount;    // ← NOUVEAU : nb d'items en file
  final int                 maxQueueSlots; // ← NOUVEAU : max slots (2)
  final VoidCallback?       onUpgrade;

  const BuildingCard({
    super.key,
    required this.building,
    required this.queue,
    required this.queueCount,
    this.maxQueueSlots = 2,
    this.onUpgrade,
  });

  static const Map<String, IconData> _icons = {
    'headquarters': Icons.account_balance,
    'timber_camp':  Icons.forest,
    'quarry':       Icons.terrain,
    'iron_mine':    Icons.hardware,
    'warehouse':    Icons.warehouse,
    'barracks':     Icons.shield,
    'farm':         Icons.agriculture,
    'wall':         Icons.security,
    'stable':       Icons.directions_run,
    'rally_point':  Icons.flag,
    'garage':       Icons.build,
    'snob':         Icons.school,
    'smith':        Icons.handyman,
    'hiding_spot':  Icons.lock_outline,
    'statue':       Icons.emoji_events,
    'market':       Icons.storefront,
  };

  static const Map<String, String> _descriptions = {
    'headquarters': 'Réduit le temps de construction',
    'timber_camp':  'Produit du bois',
    'quarry':       'Produit de la pierre',
    'iron_mine':    'Produit du fer',
    'warehouse':    'Augmente le stockage max',
    'barracks':     'Recrute des troupes',
    'farm':         'Augmente la population max',
    'wall':         '+5% défense par niveau',
    'stable':       'Permet la cavalerie',
    'rally_point':  'Permet les attaques',
    'garage':       'Construit les engins de siège',
    'snob':         'Entraîne les nobles',
    'smith':        'Améliore les capacités des troupes',
    'hiding_spot':  'Protège les ressources du pillage',
    'statue':       'Recrute le Paladin',
    'market':       'Échange de ressources entre joueurs',
  };

  static const Map<String, Color> _prodColors = {
    'timber_camp': Color(0xFF8D6E63),
    'quarry':      Color(0xFF90A4AE),
    'iron_mine':   Color(0xFF78909C),
  };

  bool get _isBeingBuilt => queue?.buildingId == building.buildingId;
  bool get _queueFull    => queueCount >= maxQueueSlots;

  @override
  Widget build(BuildContext context) {
    final icon  = _icons[building.buildingId]        ?? Icons.home;
    final desc  = _descriptions[building.buildingId] ?? '';
    final color = _prodColors[building.buildingId]   ?? Colors.amber;

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
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // ── En-tête : icône + nom + badge niveau ──
            Row(
              children: [
                Icon(icon, color: Colors.amber, size: 18),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    building.displayName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                _LevelBadge(level: building.level),
              ],
            ),
            const SizedBox(height: 4),

            // ── Description courte ──
            Text(
              desc,
              style: const TextStyle(color: Colors.white38, fontSize: 10),
              maxLines: 1,
            ),
            const SizedBox(height: 8),

            // ── Production actuelle → future ──
            if (building.isProducer && building.currentProdPerSec != null) ...[
              _ProductionRow(
                current: building.currentProdPerSec!,
                next:    building.nextProdPerSec,
                color:   color,
                isMax:   building.isMaxLevel,
              ),
              const SizedBox(height: 8),
            ],

            // ── Coûts du prochain niveau ──
            if (!building.isMaxLevel && building.nextLevelCost != null) ...[
              _CostRow(cost: building.nextLevelCost!),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.schedule, color: Colors.white38, size: 11),
                  const SizedBox(width: 3),
                  Text(
                    building.formattedTime,
                    style: const TextStyle(color: Colors.white38, fontSize: 10),
                  ),
                  const Spacer(),
                  Text(
                    '→ Niv. ${building.level + 1}',
                    style: const TextStyle(color: Colors.white24, fontSize: 10),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],

            if (building.isMaxLevel) ...[
              const Center(
                child: Text(
                  'Niveau maximum',
                  style: TextStyle(color: Colors.amber, fontSize: 10),
                ),
              ),
              const SizedBox(height: 8),
            ],

            // ── Verrouillé : affiche les prérequis manquants ──
            if (building.isLocked) ...[
              _LockedInfo(missing: building.missingPrerequisites),
            ] else ...[
              // ── Bouton améliorer ──
              _UpgradeButton(
                isBeingBuilt: _isBeingBuilt,
                queueFull:    _queueFull,
                isMaxLevel:   building.isMaxLevel,
                onUpgrade:    onUpgrade,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ProductionRow extends StatelessWidget {
  final double current;
  final double? next;
  final Color color;
  final bool isMax;

  const _ProductionRow({
    required this.current,
    required this.next,
    required this.color,
    required this.isMax,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.trending_up, size: 12, color: Colors.white54),
          const SizedBox(width: 4),
          Text(
            BuildingInstanceDto.formatRate(current),
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
            ),
          ),
          if (!isMax && next != null) ...[
            const SizedBox(width: 6),
            const Icon(Icons.arrow_forward, size: 10, color: Colors.white38),
            const SizedBox(width: 6),
            Text(
              BuildingInstanceDto.formatRate(next!),
              style: const TextStyle(
                color: Colors.greenAccent,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CostRow extends StatelessWidget {
  final NextLevelCostDto cost;
  const _CostRow({required this.cost});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _CostItem(icon: Icons.forest,   color: const Color(0xFF8D6E63), value: cost.wood),
        _CostItem(icon: Icons.terrain,  color: const Color(0xFF90A4AE), value: cost.stone),
        _CostItem(icon: Icons.hardware, color: const Color(0xFF78909C), value: cost.iron),
      ],
    );
  }
}

class _CostItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int value;
  const _CostItem({required this.icon, required this.color, required this.value});

  String _format(int v) {
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}k';
    return v.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 11),
        const SizedBox(width: 2),
        Text(
          _format(value),
          style: TextStyle(
              color: color, fontSize: 10, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

class _LevelBadge extends StatelessWidget {
  final int level;
  const _LevelBadge({required this.level});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.amber.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.amber.withOpacity(0.4)),
      ),
      child: Text(
        'Niv.$level',
        style: const TextStyle(
          color: Colors.amber,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _UpgradeButton extends StatelessWidget {
  final bool isBeingBuilt;
  final bool queueFull;    // ← CORRIGÉ : était queueOccupied
  final bool isMaxLevel;
  final VoidCallback? onUpgrade;

  const _UpgradeButton({
    required this.isBeingBuilt,
    required this.queueFull,
    required this.isMaxLevel,
    this.onUpgrade,
  });

  @override
  Widget build(BuildContext context) {
    if (isMaxLevel) return const SizedBox.shrink();

    if (isBeingBuilt) {
      return const SizedBox(
        width: double.infinity,
        child: Center(
          child: Text(
            '⏳ En construction...',
            style: TextStyle(color: Colors.amber, fontSize: 11),
          ),
        ),
      );
    }

    // ← CORRIGÉ : "En file" si slot 2 occupé mais pas ce bâtiment
    final label  = queueFull ? 'File pleine (2/2)' : 'Améliorer →';
    final bgColor = queueFull ? Colors.grey[850]! : Colors.amber[800]!;
    final fgColor = queueFull ? Colors.white38 : Colors.white;

    return SizedBox(
      width: double.infinity,
      height: 32,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: bgColor,
          foregroundColor: fgColor,
          elevation: 0,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8)),
          padding: EdgeInsets.zero,
        ),
        onPressed: queueFull ? null : onUpgrade,
        child: Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}

class _LockedInfo extends StatelessWidget {
  final List<MissingPrerequisiteDto> missing;
  const _LockedInfo({required this.missing});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.06),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.lock, color: Colors.red, size: 11),
              SizedBox(width: 4),
              Text(
                'Prérequis manquants',
                style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 3),
          ...missing.map((p) => Text(
            '• ${p.label}  (actuel : ${p.current})',
            style: const TextStyle(color: Colors.white38, fontSize: 9),
          )),
        ],
      ),
    );
  }
}
