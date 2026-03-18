import 'package:flutter/material.dart';
import '../dto/troops_dto.dart';

class UnitCard extends StatelessWidget {
  final TroopDto troop;
  final RecruitQueueDto? queue;
  final void Function(String unitType, int count)? onRecruit;

  const UnitCard({
    super.key,
    required this.troop,
    required this.queue,
    this.onRecruit,
  });

  bool get _isRecruiting => queue?.unitType == troop.unitType;
  bool get _queueOccupied => queue != null;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF222222),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isRecruiting
              ? Colors.green.withOpacity(0.6)
              : Colors.white.withOpacity(0.08),
          width: _isRecruiting ? 1.5 : 0.5,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── En-tête ──
            Row(
              children: [
                Text(troop.icon, style: const TextStyle(fontSize: 20)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    troop.name,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
                _CountBadge(count: troop.count),
              ],
            ),
            const SizedBox(height: 6),

            // ── Description ──
            Text(troop.description, style: const TextStyle(color: Colors.white38, fontSize: 10)),
            const SizedBox(height: 8),

            // ── Stats ──
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _Stat(label: 'ATK',   value: '${troop.attack}',        color: Colors.redAccent),
                _Stat(label: 'DEF',   value: '${troop.defense}',       color: Colors.blueAccent),
                _Stat(label: 'VIT',   value: '${troop.speed}s',        color: Colors.amber),
                _Stat(label: 'PORT',  value: '${troop.carryCapacity}', color: Colors.green),
              ],
            ),
            const SizedBox(height: 8),

            // ── Coût ──
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _CostItem(icon: Icons.forest,   color: const Color(0xFF8D6E63), value: troop.cost.wood),
                _CostItem(icon: Icons.terrain,  color: const Color(0xFF90A4AE), value: troop.cost.stone),
                _CostItem(icon: Icons.hardware, color: const Color(0xFF78909C), value: troop.cost.iron),
                Row(
                  children: [
                    const Icon(Icons.schedule, color: Colors.white38, size: 11),
                    const SizedBox(width: 2),
                    Text(troop.formattedRecruitTime(1),
                        style: const TextStyle(color: Colors.white38, fontSize: 10)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),

            // ── Bouton recruter ──
            _isRecruiting
                ? const Center(
                    child: Text('⏳ Recrutement...', style: TextStyle(color: Colors.green, fontSize: 11)),
                  )
                : SizedBox(
                    width: double.infinity,
                    height: 32,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _queueOccupied ? Colors.grey[850] : Colors.green[800],
                        foregroundColor: _queueOccupied ? Colors.white38 : Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: EdgeInsets.zero,
                      ),
                      onPressed: _queueOccupied
                          ? null
                          : () => _showRecruitDialog(context),
                      child: Text(
                        _queueOccupied ? 'File occupée' : 'Recruter →',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }

  void _showRecruitDialog(BuildContext context) {
    int count = 1;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          backgroundColor: const Color(0xFF222222),
          title: Text(
            'Recruter ${troop.name}',
            style: const TextStyle(color: Colors.white),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${troop.icon} ${troop.name}',
                style: const TextStyle(fontSize: 32),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    onPressed: count > 1 ? () => setState(() => count--) : null,
                    icon: const Icon(Icons.remove_circle, color: Colors.red),
                  ),
                  Text(
                    '$count',
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    onPressed: () => setState(() => count++),
                    icon: const Icon(Icons.add_circle, color: Colors.green),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Coût total : ${troop.cost.wood * count}🪵 ${troop.cost.stone * count}🪨 ${troop.cost.iron * count}⚙️',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const SizedBox(height: 4),
              Text(
                'Durée : ${troop.formattedRecruitTime(count)}',
                style: const TextStyle(color: Colors.amber, fontSize: 12),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler', style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green[800]),
              onPressed: () {
                Navigator.pop(ctx);
                onRecruit?.call(troop.unitType, count);
              },
              child: const Text('Confirmer', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final int count;
  const _CountBadge({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: count > 0 ? Colors.green.withOpacity(0.15) : Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: count > 0 ? Colors.green.withOpacity(0.4) : Colors.white12),
      ),
      child: Text(
        '$count',
        style: TextStyle(
          color: count > 0 ? Colors.greenAccent : Colors.white38,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label, value;
  final Color color;
  const _Stat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(color: Colors.white38, fontSize: 9)),
      ],
    );
  }
}

class _CostItem extends StatelessWidget {
  final IconData icon;
  final Color    color;
  final int      value;
  const _CostItem({required this.icon, required this.color, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 11),
        const SizedBox(width: 2),
        Text('$value', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
