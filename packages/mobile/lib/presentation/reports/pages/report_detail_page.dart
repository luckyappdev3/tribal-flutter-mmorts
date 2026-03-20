import 'package:flutter/material.dart';
import '../../troops/dto/troops_dto.dart';

class ReportDetailPage extends StatelessWidget {
  final AttackReportDto report;
  final String          myVillageId;

  const ReportDetailPage({
    super.key,
    required this.report,
    required this.myVillageId,
  });

  bool get _isAttacker => report.isAttacker(myVillageId);
  bool get _won        => _isAttacker ? report.attackerWon : !report.attackerWon;

  // Capacité de transport par unité (doit correspondre aux JSON game-data)
  static const Map<String, int> _carryCapacity = {
    'spearman':  25,
    'swordsman': 15,
    'axeman':    10,
    'cavalry':   100,
    'archer':    10,
  };

  static const Map<String, String> _unitNames = {
    'spearman':  'Lancier',
    'swordsman': 'Épéiste',
    'axeman':    'Hacheur',
    'cavalry':   'Cavalier',
    'archer':    'Archer',
  };
  static const Map<String, String> _unitIcons = {
    'spearman':  '🗡️',
    'swordsman': '⚔️',
    'axeman':    '🪓',
    'cavalry':   '🐴',
    'archer':    '🏹',
  };

  String _unitLabel(String type) =>
      '${_unitIcons[type] ?? '⚔️'} ${_unitNames[type] ?? type}';

  /// Capacité totale des survivants
  int get _maxCarry {
    int total = 0;
    for (final entry in report.unitsSurvived.entries) {
      total += entry.value * (_carryCapacity[entry.key] ?? 0);
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final color = _won ? Colors.green : Colors.red;

    return Scaffold(
      backgroundColor: const Color(0xFF111111),
      appBar: AppBar(
        title: Text(
          _isAttacker ? 'Rapport d\'attaque' : 'Rapport de défense',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: Colors.black87,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.amber),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // ── RÉSULTAT PRINCIPAL ──
            _ResultBanner(won: _won, isAttacker: _isAttacker),
            const SizedBox(height: 16),

            // ── EN-TÊTE ──
            _HeaderCard(report: report, isAttacker: _isAttacker),
            const SizedBox(height: 12),

            // ── PARTICIPANTS ──
            _ParticipantsCard(report: report),
            const SizedBox(height: 12),

            // ── UNITÉS ATTAQUANT ──
            _UnitTable(
              title:     _isAttacker ? 'Mes troupes' : 'Troupes attaquantes',
              color:     _isAttacker ? Colors.amber : Colors.red[300]!,
              sent:      report.unitsSent,
              survived:  report.unitsSurvived,
              unitLabel: _unitLabel,
            ),
            const SizedBox(height: 12),

            // ── UNITÉS DÉFENSEUR ──
            if (report.defenderUnitsBefore.isNotEmpty)
              _UnitTable(
                title:     _isAttacker ? 'Défenseurs' : 'Mes défenseurs',
                color:     _isAttacker ? Colors.blue[300]! : Colors.amber,
                sent:      report.defenderUnitsBefore,
                survived:  report.defenderUnitsAfter,
                unitLabel: _unitLabel,
              )
            else
              _EmptyDefenseCard(),
            const SizedBox(height: 12),

            // ── PILLAGE ──
            if (report.attackerWon && report.totalLooted > 0)
              _LootCard(
                report:   report,
                isAttacker: _isAttacker,
                maxCarry:   _maxCarry,
              ),
            const SizedBox(height: 12),

            // ── POINTS ──
            _PointsCard(report: report, isAttacker: _isAttacker, won: _won),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ── Bannière résultat ──
class _ResultBanner extends StatelessWidget {
  final bool won;
  final bool isAttacker;
  const _ResultBanner({required this.won, required this.isAttacker});

  @override
  Widget build(BuildContext context) {
    final color = won ? Colors.green : Colors.red;
    final label = won
        ? (isAttacker ? '⚔️ Victoire — Attaque réussie' : '🛡️ Victoire — Défense réussie')
        : (isAttacker ? '💀 Défaite — Attaque repoussée' : '💀 Défaite — Village pillé');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5), width: 1.5),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center),
    );
  }
}

// ── En-tête ──
class _HeaderCard extends StatelessWidget {
  final AttackReportDto report;
  final bool            isAttacker;
  const _HeaderCard({required this.report, required this.isAttacker});

  @override
  Widget build(BuildContext context) {
    final dt = report.createdAt;
    final dateStr = '${dt.day.toString().padLeft(2,'0')}/'
        '${dt.month.toString().padLeft(2,'0')}/'
        '${dt.year} à '
        '${dt.hour.toString().padLeft(2,'0')}:'
        '${dt.minute.toString().padLeft(2,'0')}';

    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.access_time, color: Colors.white38, size: 14),
            const SizedBox(width: 6),
            Text(dateStr, style: const TextStyle(color: Colors.white54, fontSize: 13)),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Icon(
              isAttacker ? Icons.arrow_upward : Icons.arrow_downward,
              color: isAttacker ? Colors.red[300] : Colors.orange,
              size: 16,
            ),
            const SizedBox(width: 6),
            Text(
              isAttacker ? 'Attaque sur' : 'Attaque de',
              style: const TextStyle(color: Colors.white54, fontSize: 12),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                isAttacker
                    ? (report.defenderVillage?.displayName ?? report.defenderVillageId)
                    : (report.attackerVillage?.name        ?? report.attackerVillageId),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ]),
        ],
      ),
    );
  }
}

// ── Participants ──
class _ParticipantsCard extends StatelessWidget {
  final AttackReportDto report;
  const _ParticipantsCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final attacker = report.attackerVillage;
    final defender = report.defenderVillage;

    return _Card(
      child: Row(
        children: [
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('⚔️ Attaquant',
                  style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(attacker?.name ?? '—',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
              Text(attacker?.playerName ?? '—',
                  style: const TextStyle(color: Colors.white54, fontSize: 11)),
              if (attacker != null)
                Text('(${attacker.x}, ${attacker.y})',
                    style: const TextStyle(color: Colors.white24, fontSize: 10)),
            ],
          )),
          Container(width: 1, height: 60, color: Colors.white12,
              margin: const EdgeInsets.symmetric(horizontal: 12)),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('🛡️ Défenseur',
                  style: TextStyle(color: Colors.blue, fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(defender?.displayName ?? '—',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              Text(defender?.isAbandoned == true ? 'Village Abandonné' : (defender?.playerName ?? '—'),
                  style: const TextStyle(color: Colors.white54, fontSize: 11)),
              if (defender != null)
                Text('(${defender.x}, ${defender.y})',
                    style: const TextStyle(color: Colors.white24, fontSize: 10)),
            ],
          )),
        ],
      ),
    );
  }
}

// ── Tableau des unités ──
class _UnitTable extends StatelessWidget {
  final String                  title;
  final Color                   color;
  final Map<String, int>        sent;
  final Map<String, int>        survived;
  final String Function(String) unitLabel;

  const _UnitTable({
    required this.title,
    required this.color,
    required this.sent,
    required this.survived,
    required this.unitLabel,
  });

  @override
  Widget build(BuildContext context) {
    final units = sent.keys.toList();
    if (units.isEmpty) return const SizedBox.shrink();

    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 10),
          Row(children: const [
            Expanded(flex: 3, child: Text('Unité',    style: TextStyle(color: Colors.white38, fontSize: 11))),
            Expanded(flex: 2, child: Text('Engagés',  style: TextStyle(color: Colors.white38, fontSize: 11), textAlign: TextAlign.center)),
            Expanded(flex: 2, child: Text('Pertes',   style: TextStyle(color: Colors.red,     fontSize: 11), textAlign: TextAlign.center)),
            Expanded(flex: 2, child: Text('Restants', style: TextStyle(color: Colors.green,   fontSize: 11), textAlign: TextAlign.center)),
          ]),
          const Divider(color: Colors.white12, height: 12),
          ...units.map((type) {
            final totalSent = sent[type]     ?? 0;
            final totalSurv = survived[type] ?? 0;
            final losses    = totalSent - totalSurv;
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(children: [
                Expanded(flex: 3, child: Text(unitLabel(type),
                    style: const TextStyle(color: Colors.white70, fontSize: 12))),
                Expanded(flex: 2, child: Text('$totalSent',
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    textAlign: TextAlign.center)),
                Expanded(flex: 2, child: Text(losses > 0 ? '-$losses' : '0',
                    style: TextStyle(
                      color: losses > 0 ? Colors.red[300] : Colors.white38,
                      fontSize: 12,
                      fontWeight: losses > 0 ? FontWeight.bold : FontWeight.normal,
                    ),
                    textAlign: TextAlign.center)),
                Expanded(flex: 2, child: Text('$totalSurv',
                    style: TextStyle(
                      color: totalSurv > 0 ? Colors.green[300] : Colors.white38,
                      fontSize: 12, fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center)),
              ]),
            );
          }),
        ],
      ),
    );
  }
}

// ── Aucun défenseur ──
class _EmptyDefenseCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Row(children: const [
        Icon(Icons.info_outline, color: Colors.grey, size: 16),
        SizedBox(width: 8),
        Text('Aucun défenseur — village vide ou abandonné',
            style: TextStyle(color: Colors.white38, fontSize: 12)),
      ]),
    );
  }
}

// ── Pillage ──
class _LootCard extends StatelessWidget {
  final AttackReportDto report;
  final bool            isAttacker;
  final int             maxCarry;

  const _LootCard({
    required this.report,
    required this.isAttacker,
    required this.maxCarry,
  });

  @override
  Widget build(BuildContext context) {
    final loot      = report.resourcesLooted;
    final wood      = loot['wood']  ?? 0;
    final stone     = loot['stone'] ?? 0;
    final iron      = loot['iron']  ?? 0;
    final total     = report.totalLooted;
    final pct       = maxCarry > 0 ? (total / maxCarry).clamp(0.0, 1.0) : 0.0;
    final barColor  = pct >= 0.9 ? Colors.red : (pct >= 0.6 ? Colors.orange : Colors.amber);

    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isAttacker ? '💰 Ressources pillées' : '💸 Ressources volées',
            style: TextStyle(
              color: isAttacker ? Colors.amber : Colors.red[300],
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 12),

          // 3 ressources
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _ResourceItem(icon: '🪵', label: 'Bois',   value: wood),
              _ResourceItem(icon: '🪨', label: 'Pierre', value: stone),
              _ResourceItem(icon: '⚙️', label: 'Fer',    value: iron),
            ],
          ),
          const SizedBox(height: 14),

          // Capacité utilisée / max
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Capacité de transport',
                  style: TextStyle(color: Colors.white54, fontSize: 11)),
              Text(
                '$total / $maxCarry',
                style: TextStyle(color: barColor, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value:            pct,
              minHeight:        6,
              backgroundColor:  Colors.white12,
              valueColor:       AlwaysStoppedAnimation<Color>(barColor),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResourceItem extends StatelessWidget {
  final String icon;
  final String label;
  final int    value;
  const _ResourceItem({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text(icon, style: const TextStyle(fontSize: 22)),
      const SizedBox(height: 4),
      Text('$value',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
      Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10)),
    ]);
  }
}

// ── Points ──
class _PointsCard extends StatelessWidget {
  final AttackReportDto report;
  final bool            isAttacker;
  final bool            won;
  const _PointsCard({required this.report, required this.isAttacker, required this.won});

  @override
  Widget build(BuildContext context) {
    final color  = won ? Colors.green : Colors.red;
    final points = isAttacker ? report.pointsGained : report.pointsLost;
    final sign   = isAttacker ? '+' : '-';

    return _Card(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('Points de combat', style: TextStyle(color: Colors.white70, fontSize: 13)),
          Text('$sign$points pts',
              style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
        ],
      ),
    );
  }
}

// ── Carte générique ──
class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: child,
    );
  }
}