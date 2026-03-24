import 'package:flutter/material.dart';
import '../../troops/dto/troops_dto.dart';

class CombatReportDetailPage extends StatelessWidget {
  final CombatReportDto report;
  final String          myVillageId;

  const CombatReportDetailPage({
    super.key,
    required this.report,
    required this.myVillageId,
  });

  bool get _isAttacker => report.isAttacker(myVillageId);

  bool get _attackerLostAll {
    final sent     = report.unitsSent?.values.fold(0, (s, v) => s + v) ?? 0;
    final survived = report.unitsSurvived?.values.fold(0, (s, v) => s + v) ?? 0;
    return survived == 0 && sent > 0;
  }

  bool get _defenderLostAll {
    final before = report.defenderUnitsBefore?.values.fold(0, (s, v) => s + v) ?? 0;
    final after  = report.defenderUnitsAfter?.values.fold(0, (s, v) => s + v) ?? 0;
    return before > 0 && after == 0;
  }

  bool get _mutualDestruction => _attackerLostAll && _defenderLostAll;

  bool get _won {
    if (!report.hasCombat) return false;
    if (_mutualDestruction) return !_isAttacker;
    return _isAttacker ? report.attackerWon! : !report.attackerWon!;
  }

  bool get _hideDefenderInfo => _isAttacker && _attackerLostAll;

  // ── Capacité de transport des survivants ──
  static const Map<String, int> _carryCapacity = {
    'spearman': 25, 'swordsman': 15, 'axeman': 10,
    'cavalry': 100, 'archer': 10, 'light_cavalry': 80,
    'mounted_archer': 50, 'heavy_cavalry': 50,
  };

  static const Map<String, String> _unitNames = {
    'spearman': 'Lancier', 'swordsman': 'Épéiste', 'axeman': 'Hacheur',
    'cavalry': 'Cavalier', 'archer': 'Archer', 'scout': 'Éclaireur',
    'light_cavalry': 'Cav. légère', 'mounted_archer': 'Archer monté',
    'heavy_cavalry': 'Cav. lourde', 'ram': 'Bélier',
    'catapult': 'Catapulte', 'paladin': 'Paladin', 'noble': 'Noble',
  };

  static const Map<String, String> _unitIcons = {
    'spearman': '🗡️', 'swordsman': '⚔️', 'axeman': '🪓',
    'cavalry': '🐴', 'archer': '🏹', 'scout': '🔍',
    'light_cavalry': '🐎', 'mounted_archer': '🏹', 'heavy_cavalry': '🛡️',
    'ram': '🪨', 'catapult': '💣', 'paladin': '⚔️', 'noble': '👑',
  };

  static const Map<String, String> _buildingNames = {
    'headquarters': 'Siège social', 'barracks': 'Caserne', 'stable': 'Écuries',
    'garage': 'Garage', 'rally_point': 'Place d\'armes', 'smith': 'Forge',
    'wall': 'Mur', 'farm': 'Ferme', 'warehouse': 'Entrepôt',
    'timber_camp': 'Camp de bois', 'quarry': 'Carrière', 'iron_mine': 'Mine de fer',
    'market': 'Marché', 'hiding_spot': 'Cachette', 'statue': 'Statue', 'snob': 'Académie',
  };

  String _unitLabel(String type) =>
      '${_unitIcons[type] ?? '⚔️'} ${_unitNames[type] ?? type}';
  String _buildingLabel(String id) => _buildingNames[id] ?? id;

  int get _maxCarry {
    int total = 0;
    for (final e in (report.unitsSurvived ?? {}).entries) {
      total += e.value * (_carryCapacity[e.key] ?? 0);
    }
    return total;
  }

  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')}/'
      '${dt.year} à '
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final isCombined = report.type == 'combined';
    final isScoutOnly = report.type == 'scout';

    String appBarTitle;
    if (isScoutOnly) {
      appBarTitle = report.isDefenderReport ? 'Village espionné' : 'Rapport d\'espionnage';
    } else if (isCombined) {
      appBarTitle = _isAttacker ? 'Attaque + espionnage' : 'Rapport de défense';
    } else {
      appBarTitle = _isAttacker ? 'Rapport d\'attaque' : 'Rapport de défense';
    }

    return Scaffold(
      backgroundColor: const Color(0xFF111111),
      appBar: AppBar(
        title: Text(appBarTitle,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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
            // ── Section combat ────────────────────────────────────
            if (report.hasCombat) ...[
              _CombatResultBanner(
                won:               _won,
                isAttacker:        _isAttacker,
                mutualDestruction: _mutualDestruction,
              ),
              const SizedBox(height: 16),
              _HeaderCard(report: report, isAttacker: _isAttacker, formatDate: _formatDate),
              const SizedBox(height: 12),
              _ParticipantsCard(report: report),
              const SizedBox(height: 12),
              _UnitTable(
                title:     _isAttacker ? 'Mes troupes' : 'Troupes attaquantes',
                color:     _isAttacker ? Colors.amber : Colors.red[300]!,
                sent:      report.unitsSent ?? {},
                survived:  report.unitsSurvived ?? {},
                unitLabel: _unitLabel,
              ),
              const SizedBox(height: 12),
              if (_hideDefenderInfo)
                _HiddenDefenderCard()
              else if ((report.defenderUnitsBefore ?? {}).isNotEmpty)
                _UnitTable(
                  title:     _isAttacker ? 'Défenseurs' : 'Mes défenseurs',
                  color:     _isAttacker ? Colors.blue[300]! : Colors.amber,
                  sent:      report.defenderUnitsBefore ?? {},
                  survived:  report.defenderUnitsAfter ?? {},
                  unitLabel: _unitLabel,
                )
              else
                _EmptyDefenseCard(),
              const SizedBox(height: 12),
              if ((report.attackerWon ?? false) && report.totalLooted > 0) ...[
                _LootCard(report: report, isAttacker: _isAttacker, maxCarry: _maxCarry),
                const SizedBox(height: 12),
              ],
              _PointsCard(report: report, isAttacker: _isAttacker, won: _won),
              const SizedBox(height: 12),
              _CombatConditionsCard(report: report, isAttacker: _isAttacker),
            ],

            // ── Séparateur si combiné (attaquant) ────────────────
            if (isCombined && !report.isDefenderReport) ...[
              const SizedBox(height: 20),
              Row(children: [
                const Expanded(child: Divider(color: Colors.white12)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text('🔍 Espionnage',
                      style: TextStyle(color: Colors.amber.withOpacity(0.7), fontSize: 12)),
                ),
                const Expanded(child: Divider(color: Colors.white12)),
              ]),
              const SizedBox(height: 16),
            ],

            // ── Section espionnage ────────────────────────────────
            if (report.hasScout) ...[
              if (!report.isDefenderReport) ...[
                _ScoutResultBanner(tier: report.tier!),
                const SizedBox(height: 12),
                _ScoutsCard(report: report),
                const SizedBox(height: 12),
                if (report.tier! >= 1) ...[
                  _ResourcesCard(resources: report.scoutResources ?? {}),
                  const SizedBox(height: 12),
                  _TroopsCard(
                    title: 'Troupes stationnées',
                    troops: report.troopsAtHome ?? {},
                    unitLabel: _unitLabel,
                  ),
                ] else
                  _LockedSection(label: 'Ressources & Troupes stationnées', requiredTier: 1),
                const SizedBox(height: 12),
                if (report.tier! >= 2)
                  _BuildingsCard(buildings: report.buildings ?? {}, buildingLabel: _buildingLabel)
                else
                  _LockedSection(label: 'Bâtiments', requiredTier: 2),
                const SizedBox(height: 12),
                if (report.tier! >= 3)
                  _TroopsCard(
                    title: 'Troupes à l\'extérieur',
                    troops: report.troopsOutside ?? {},
                    unitLabel: _unitLabel,
                    color: Colors.orange,
                  )
                else
                  _LockedSection(label: 'Troupes à l\'extérieur', requiredTier: 3),
              ] else if ((report.tier ?? 0) > 0) ...[
                // Vue défenseur espionné — uniquement si espionnage réussi
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.orange.withOpacity(0.3)),
                  ),
                  child: const Row(children: [
                    Icon(Icons.visibility, color: Colors.orange, size: 16),
                    SizedBox(width: 8),
                    Text('L\'ennemi a espionné votre village',
                        style: TextStyle(color: Colors.orange, fontSize: 13)),
                  ]),
                ),
              ],
            ],

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Widgets communs
// ─────────────────────────────────────────────────────────────────────────────

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});

  @override
  Widget build(BuildContext context) => Container(
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

// ─── Combat ───────────────────────────────────────────────────────────────────

class _CombatResultBanner extends StatelessWidget {
  final bool won, isAttacker, mutualDestruction;
  const _CombatResultBanner({required this.won, required this.isAttacker, this.mutualDestruction = false});

  @override
  Widget build(BuildContext context) {
    final color = won ? Colors.green : Colors.red;
    final label = mutualDestruction
        ? (isAttacker ? '💀 Défaite — Anéantissement mutuel' : '🛡️ Victoire — Anéantissement mutuel')
        : won
            ? (isAttacker ? '⚔️ Victoire — Attaque réussie'  : '🛡️ Victoire — Défense réussie')
            : (isAttacker ? '💀 Défaite — Attaque repoussée' : '💀 Défaite — Village pillé');
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5), width: 1.5),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final CombatReportDto report;
  final bool isAttacker;
  final String Function(DateTime) formatDate;
  const _HeaderCard({required this.report, required this.isAttacker, required this.formatDate});

  @override
  Widget build(BuildContext context) => _Card(
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Icon(Icons.access_time, color: Colors.white38, size: 14),
        const SizedBox(width: 6),
        Text(formatDate(report.createdAt),
            style: const TextStyle(color: Colors.white54, fontSize: 13)),
      ]),
      const SizedBox(height: 8),
      Row(children: [
        Icon(isAttacker ? Icons.arrow_upward : Icons.arrow_downward,
            color: isAttacker ? Colors.red[300] : Colors.orange, size: 16),
        const SizedBox(width: 6),
        Text(isAttacker ? 'Attaque sur' : 'Attaque de',
            style: const TextStyle(color: Colors.white54, fontSize: 12)),
        const SizedBox(width: 6),
        Expanded(child: Text(
          isAttacker
              ? (report.defenderVillage?.displayName ?? report.defenderVillageId)
              : (report.attackerVillage?.name        ?? report.attackerVillageId),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
          overflow: TextOverflow.ellipsis,
        )),
      ]),
    ]),
  );
}

class _ParticipantsCard extends StatelessWidget {
  final CombatReportDto report;
  const _ParticipantsCard({required this.report});

  @override
  Widget build(BuildContext context) => _Card(
    child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('⚔️ Attaquant',
            style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(report.attackerVillage?.name ?? '—',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
        Text(report.attackerVillage?.playerName ?? '—',
            style: const TextStyle(color: Colors.white54, fontSize: 11)),
        if (report.attackerVillage != null)
          Text('(${report.attackerVillage!.x}, ${report.attackerVillage!.y})',
              style: const TextStyle(color: Colors.white24, fontSize: 10)),
      ])),
      Container(width: 1, height: 60, color: Colors.white12,
          margin: const EdgeInsets.symmetric(horizontal: 12)),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('🛡️ Défenseur',
            style: TextStyle(color: Colors.blue, fontSize: 11, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(report.defenderVillage?.displayName ?? '—',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            maxLines: 2, overflow: TextOverflow.ellipsis),
        Text(report.defenderVillage?.isAbandoned == true
            ? 'Village Abandonné'
            : (report.defenderVillage?.playerName ?? '—'),
            style: const TextStyle(color: Colors.white54, fontSize: 11)),
        if (report.defenderVillage != null)
          Text('(${report.defenderVillage!.x}, ${report.defenderVillage!.y})',
              style: const TextStyle(color: Colors.white24, fontSize: 10)),
      ])),
    ]),
  );
}

class _UnitTable extends StatelessWidget {
  final String title;
  final String Function(String) unitLabel;
  final Color color;
  final Map<String, int> sent;
  final Map<String, int> survived;

  const _UnitTable({
    required this.title, required this.color,
    required this.sent, required this.survived, required this.unitLabel,
  });

  @override
  Widget build(BuildContext context) {
    final units = sent.keys.toList();
    if (units.isEmpty) return const SizedBox.shrink();
    return _Card(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
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
        final s = sent[type]     ?? 0;
        final r = survived[type] ?? 0;
        final l = s - r;
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            Expanded(flex: 3, child: Text(unitLabel(type),
                style: const TextStyle(color: Colors.white70, fontSize: 12))),
            Expanded(flex: 2, child: Text('$s',
                style: const TextStyle(color: Colors.white, fontSize: 12),
                textAlign: TextAlign.center)),
            Expanded(flex: 2, child: Text(l > 0 ? '-$l' : '0',
                style: TextStyle(
                  color: l > 0 ? Colors.red[300] : Colors.white38,
                  fontSize: 12, fontWeight: l > 0 ? FontWeight.bold : FontWeight.normal,
                ), textAlign: TextAlign.center)),
            Expanded(flex: 2, child: Text('$r',
                style: TextStyle(
                  color: r > 0 ? Colors.green[300] : Colors.white38,
                  fontSize: 12, fontWeight: FontWeight.bold,
                ), textAlign: TextAlign.center)),
          ]),
        );
      }),
    ]));
  }
}

class _HiddenDefenderCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) => _Card(
    child: Row(children: const [
      Icon(Icons.lock_outline, color: Colors.white38, size: 16),
      SizedBox(width: 8),
      Expanded(child: Text(
        'Informations défensives inconnues — aucun éclaireur n\'est revenu.',
        style: TextStyle(color: Colors.white38, fontSize: 12),
      )),
    ]),
  );
}

class _EmptyDefenseCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) => _Card(
    child: Row(children: const [
      Icon(Icons.info_outline, color: Colors.grey, size: 16),
      SizedBox(width: 8),
      Text('Aucun défenseur — village vide ou abandonné',
          style: TextStyle(color: Colors.white38, fontSize: 12)),
    ]),
  );
}

class _LootCard extends StatelessWidget {
  final CombatReportDto report;
  final bool isAttacker;
  final int maxCarry;
  const _LootCard({required this.report, required this.isAttacker, required this.maxCarry});

  @override
  Widget build(BuildContext context) {
    final loot  = report.resourcesLooted ?? {};
    final wood  = loot['wood']  ?? 0;
    final stone = loot['stone'] ?? 0;
    final iron  = loot['iron']  ?? 0;
    final total = report.totalLooted;
    final pct   = maxCarry > 0 ? (total / maxCarry).clamp(0.0, 1.0) : 0.0;
    final barColor = pct >= 0.9 ? Colors.red : (pct >= 0.6 ? Colors.orange : Colors.amber);

    return _Card(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(isAttacker ? '💰 Ressources pillées' : '💸 Ressources volées',
          style: TextStyle(
            color: isAttacker ? Colors.amber : Colors.red[300],
            fontWeight: FontWeight.bold, fontSize: 13,
          )),
      const SizedBox(height: 12),
      Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _ResItem(icon: '🪵', label: 'Bois',   value: wood),
        _ResItem(icon: '🪨', label: 'Pierre', value: stone),
        _ResItem(icon: '⚙️', label: 'Fer',    value: iron),
      ]),
      const SizedBox(height: 14),
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        const Text('Capacité de transport',
            style: TextStyle(color: Colors.white54, fontSize: 11)),
        Text('$total / $maxCarry',
            style: TextStyle(color: barColor, fontSize: 11, fontWeight: FontWeight.bold)),
      ]),
      const SizedBox(height: 6),
      ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: pct, minHeight: 6,
          backgroundColor: Colors.white12,
          valueColor: AlwaysStoppedAnimation<Color>(barColor),
        ),
      ),
    ]));
  }
}

class _PointsCard extends StatelessWidget {
  final CombatReportDto report;
  final bool isAttacker, won;
  const _PointsCard({required this.report, required this.isAttacker, required this.won});

  @override
  Widget build(BuildContext context) {
    final color  = won ? Colors.green : Colors.red;
    final points = isAttacker ? report.pointsGained : report.pointsLost;
    final sign   = isAttacker ? '+' : '-';
    return _Card(child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      const Text('Points de combat', style: TextStyle(color: Colors.white70, fontSize: 13)),
      Text('$sign$points pts',
          style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
    ]));
  }
}

class _CombatConditionsCard extends StatelessWidget {
  final CombatReportDto report;
  final bool isAttacker;
  const _CombatConditionsCard({required this.report, required this.isAttacker});

  @override
  Widget build(BuildContext context) {
    final morale    = report.morale;
    final wallBonus = report.wallBonus;
    final moraleOk  = morale >= 0.99;
    final wallOk    = wallBonus <= 1.01;
    return _Card(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('⚙️ Conditions de combat',
          style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 13)),
      const SizedBox(height: 12),
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Row(children: [
          Icon(moraleOk ? Icons.sentiment_satisfied : Icons.sentiment_dissatisfied,
              color: moraleOk ? Colors.green : Colors.orange, size: 16),
          const SizedBox(width: 6),
          const Text('Morale attaquant', style: TextStyle(color: Colors.white54, fontSize: 12)),
        ]),
        Text('${(morale * 100).toStringAsFixed(0)}%',
            style: TextStyle(
              color: moraleOk ? Colors.white : Colors.orange,
              fontWeight: FontWeight.bold, fontSize: 13,
            )),
      ]),
      if (!moraleOk)
        Padding(
          padding: const EdgeInsets.only(left: 22, top: 2),
          child: Text('Malus attaque (attaquant trop fort vs défenseur)',
              style: TextStyle(color: Colors.orange.withOpacity(0.7), fontSize: 10)),
        ),
      if (!isAttacker) ...[
        const SizedBox(height: 10),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Row(children: [
            Icon(Icons.security,
                color: wallOk ? Colors.white38 : Colors.blue[300], size: 16),
            const SizedBox(width: 6),
            const Text('Bonus mur défenseur',
                style: TextStyle(color: Colors.white54, fontSize: 12)),
          ]),
          Text(wallOk ? 'Aucun mur' : '×${wallBonus.toStringAsFixed(2)}',
              style: TextStyle(
                color: wallOk ? Colors.white38 : Colors.blue[300],
                fontWeight: FontWeight.bold, fontSize: 13,
              )),
        ]),
        if (!wallOk)
          Padding(
            padding: const EdgeInsets.only(left: 22, top: 2),
            child: Text('Le mur a renforcé la défense de ×${wallBonus.toStringAsFixed(2)}',
                style: TextStyle(color: Colors.blue.withOpacity(0.7), fontSize: 10)),
          ),
      ],
    ]));
  }
}

// ─── Scout ────────────────────────────────────────────────────────────────────

class _ScoutResultBanner extends StatelessWidget {
  final int tier;
  const _ScoutResultBanner({required this.tier});

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (tier) {
      0 => (Colors.red,   '❌ Échec — Tous les éclaireurs ont été tués'),
      1 => (Colors.orange,'🔍 Palier 1 — Informations partielles'),
      2 => (Colors.amber, '🔍 Palier 2 — Informations avancées'),
      _ => (Colors.green, '🔍 Palier 3 — Rapport complet'),
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5), width: 1.5),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center),
    );
  }
}

class _ScoutsCard extends StatelessWidget {
  final CombatReportDto report;
  const _ScoutsCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final sent     = report.scoutsSent     ?? 0;
    final lost     = report.scoutsLost     ?? 0;
    final survived = report.scoutsSurvived ?? 0;
    final ratio    = report.survivorRatio  ?? 0.0;
    final color    = ratio > 0.7 ? Colors.green
        : ratio > 0.5 ? Colors.amber
        : ratio > 0   ? Colors.orange
        : Colors.red;

    return _Card(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('🔍 Éclaireurs envoyés',
          style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 13)),
      const SizedBox(height: 12),
      Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _ScoutStat(label: 'Envoyés',  value: sent,     color: Colors.white70),
        _ScoutStat(label: 'Perdus',   value: lost,     color: Colors.red),
        _ScoutStat(label: 'Revenus',  value: survived, color: Colors.green),
      ]),
      if (survived > 0) ...[
        const SizedBox(height: 10),
        const Divider(color: Colors.white12, height: 1),
        const SizedBox(height: 10),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('Éclaireurs ennemis éliminés',
              style: TextStyle(color: Colors.white54, fontSize: 11)),
          Text('${report.defenderScoutsKilled ?? 0}',
              style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 13)),
        ]),
      ],
      const SizedBox(height: 12),
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        const Text('Taux de survie', style: TextStyle(color: Colors.white54, fontSize: 11)),
        Text('${(ratio * 100).toStringAsFixed(0)}%',
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
      ]),
      const SizedBox(height: 6),
      ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: ratio, minHeight: 6,
          backgroundColor: Colors.white12,
          valueColor: AlwaysStoppedAnimation<Color>(color),
        ),
      ),
    ]));
  }
}

class _ScoutStat extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _ScoutStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(children: [
    Text('$value', style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
    Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10)),
  ]);
}

class _ResourcesCard extends StatelessWidget {
  final Map<String, int> resources;
  const _ResourcesCard({required this.resources});

  @override
  Widget build(BuildContext context) => _Card(child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('💰 Ressources',
          style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 13)),
      const SizedBox(height: 12),
      Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _ResItem(icon: '🪵', label: 'Bois',   value: resources['wood']  ?? 0),
        _ResItem(icon: '🪨', label: 'Pierre', value: resources['stone'] ?? 0),
        _ResItem(icon: '⚙️', label: 'Fer',    value: resources['iron']  ?? 0),
      ]),
    ],
  ));
}

class _ResItem extends StatelessWidget {
  final String icon, label;
  final int value;
  const _ResItem({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Column(children: [
    Text(icon, style: const TextStyle(fontSize: 22)),
    const SizedBox(height: 4),
    Text('$value',
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
    Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10)),
  ]);
}

class _TroopsCard extends StatelessWidget {
  final String title;
  final Map<String, int> troops;
  final String Function(String) unitLabel;
  final Color color;
  const _TroopsCard({
    required this.title, required this.troops,
    required this.unitLabel, this.color = Colors.blue,
  });

  @override
  Widget build(BuildContext context) {
    if (troops.isEmpty) {
      return _Card(child: Row(children: [
        Icon(Icons.info_outline, color: color.withOpacity(0.6), size: 16),
        const SizedBox(width: 8),
        Text('$title — Aucune troupe',
            style: const TextStyle(color: Colors.white38, fontSize: 12)),
      ]));
    }
    return _Card(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
      const SizedBox(height: 10),
      Row(children: const [
        Expanded(flex: 4, child: Text('Unité',  style: TextStyle(color: Colors.white38, fontSize: 11))),
        Expanded(flex: 2, child: Text('Nombre', style: TextStyle(color: Colors.white38, fontSize: 11), textAlign: TextAlign.center)),
      ]),
      const Divider(color: Colors.white12, height: 12),
      ...troops.entries.map((e) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(children: [
          Expanded(flex: 4, child: Text(unitLabel(e.key),
              style: const TextStyle(color: Colors.white70, fontSize: 12))),
          Expanded(flex: 2, child: Text('${e.value}',
              style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center)),
        ]),
      )),
    ]));
  }
}

class _BuildingsCard extends StatelessWidget {
  final Map<String, int> buildings;
  final String Function(String) buildingLabel;
  const _BuildingsCard({required this.buildings, required this.buildingLabel});

  @override
  Widget build(BuildContext context) => _Card(child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('🏗️ Bâtiments',
          style: TextStyle(color: Colors.purple, fontWeight: FontWeight.bold, fontSize: 13)),
      const SizedBox(height: 10),
      Row(children: const [
        Expanded(flex: 4, child: Text('Bâtiment', style: TextStyle(color: Colors.white38, fontSize: 11))),
        Expanded(flex: 2, child: Text('Niveau',   style: TextStyle(color: Colors.white38, fontSize: 11), textAlign: TextAlign.center)),
      ]),
      const Divider(color: Colors.white12, height: 12),
      ...buildings.entries.map((e) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(children: [
          Expanded(flex: 4, child: Text(buildingLabel(e.key),
              style: const TextStyle(color: Colors.white70, fontSize: 12))),
          Expanded(flex: 2, child: Text('Niv. ${e.value}',
              style: const TextStyle(color: Colors.purple, fontSize: 12, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center)),
        ]),
      )),
    ],
  ));
}

class _LockedSection extends StatelessWidget {
  final String label;
  final int requiredTier;
  const _LockedSection({required this.label, required this.requiredTier});

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
    decoration: BoxDecoration(
      color: Colors.white.withOpacity(0.04),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Colors.white12),
    ),
    child: Row(children: [
      const Icon(Icons.lock_outline, color: Colors.white24, size: 20),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(
            color: Colors.white38, fontSize: 13, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text('Palier $requiredTier nécessaire',
            style: TextStyle(color: Colors.amber.withOpacity(0.5), fontSize: 11)),
      ])),
    ]),
  );
}


