import 'package:flutter/material.dart';
import '../../troops/dto/troops_dto.dart';

class ScoutReportDetailPage extends StatelessWidget {
  final ScoutReportDto report;
  final String         myVillageId;

  const ScoutReportDetailPage({
    super.key,
    required this.report,
    required this.myVillageId,
  });

  static const Map<String, String> _unitNames = {
    'spearman':       'Lancier',
    'swordsman':      'Épéiste',
    'axeman':         'Hacheur',
    'archer':         'Archer',
    'scout':          'Éclaireur',
    'light_cavalry':  'Cavalerie légère',
    'mounted_archer': 'Archer monté',
    'heavy_cavalry':  'Cavalerie lourde',
    'ram':            'Bélier',
    'catapult':       'Catapulte',
    'paladin':        'Paladin',
    'noble':          'Noble',
  };

  static const Map<String, String> _buildingNames = {
    'headquarters': 'Siège social',
    'barracks':     'Caserne',
    'stable':       'Écuries',
    'garage':       'Garage',
    'rally_point':  'Place d\'armes',
    'smith':        'Forge',
    'wall':         'Mur',
    'farm':         'Ferme',
    'warehouse':    'Entrepôt',
    'timber_camp':  'Camp de bois',
    'quarry':       'Carrière',
    'iron_mine':    'Mine de fer',
    'market':       'Marché',
    'hiding_spot':  'Cachette',
    'statue':       'Statue',
    'snob':         'Académie',
  };

  String _unitLabel(String type) => _unitNames[type] ?? type;
  String _buildingLabel(String id) => _buildingNames[id] ?? id;

  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')}/'
      '${dt.year} à '
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final isDefender = report.isDefenderReport;

    return Scaffold(
      backgroundColor: const Color(0xFF111111),
      appBar: AppBar(
        title: Text(
          isDefender ? 'Village espionné' : 'Rapport d\'espionnage',
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
        child: isDefender
            ? _buildDefenderView(context)
            : _buildAttackerView(context),
      ),
    );
  }

  Widget _buildDefenderView(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _DefenderBanner(report: report),
        const SizedBox(height: 16),
        _DefenderHeaderCard(report: report, formatDate: _formatDate),
        const SizedBox(height: 12),
        if (report.scoutsLost > 0) ...[
          _DefenderScoutsKilledCard(report: report),
          const SizedBox(height: 12),
        ],
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildAttackerView(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ResultBanner(report: report),
        const SizedBox(height: 16),

        _HeaderCard(report: report, formatDate: _formatDate),
        const SizedBox(height: 12),

        _ScoutsCard(report: report),
        const SizedBox(height: 12),

        // Palier 1 — ressources + troupes stationnées
        if (report.tier >= 1) ...[
          _ResourcesCard(report: report),
          const SizedBox(height: 12),
          _TroopsCard(
            title: 'Troupes stationnées',
            troops: report.troopsAtHome ?? {},
            unitLabel: _unitLabel,
          ),
        ] else
          _LockedSection(label: 'Ressources & Troupes stationnées', requiredTier: 1),
        const SizedBox(height: 12),

        // Palier 2 — bâtiments
        if (report.tier >= 2)
          _BuildingsCard(
            buildings: report.buildings ?? {},
            buildingLabel: _buildingLabel,
          )
        else
          _LockedSection(label: 'Bâtiments', requiredTier: 2),
        const SizedBox(height: 12),

        // Palier 3 — troupes à l'extérieur
        if (report.tier >= 3)
          _TroopsCard(
            title: 'Troupes à l\'extérieur',
            troops: report.troopsOutside ?? {},
            unitLabel: _unitLabel,
            color: Colors.orange,
          )
        else
          _LockedSection(label: 'Troupes à l\'extérieur', requiredTier: 3),

        const SizedBox(height: 16),
      ],
    );
  }
}

// ── Section verrouillée ──
class _LockedSection extends StatelessWidget {
  final String label;
  final int    requiredTier;
  const _LockedSection({required this.label, required this.requiredTier});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_outline, color: Colors.white24, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(color: Colors.white38, fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text('Palier $requiredTier nécessaire',
                    style: TextStyle(color: Colors.amber.withOpacity(0.5), fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Bannière résultat ──
class _ResultBanner extends StatelessWidget {
  final ScoutReportDto report;
  const _ResultBanner({required this.report});

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (report.tier) {
      0 => (Colors.red,   '❌ Échec — Tous les éclaireurs ont été tués'),
      1 => (Colors.orange,'🔍 Palier 1 — Informations partielles'),
      2 => (Colors.amber, '🔍 Palier 2 — Informations avancées'),
      _ => (Colors.green, '🔍 Palier 3 — Rapport complet'),
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5), width: 1.5),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center),
    );
  }
}

// ── En-tête ──
class _HeaderCard extends StatelessWidget {
  final ScoutReportDto        report;
  final String Function(DateTime) formatDate;
  const _HeaderCard({required this.report, required this.formatDate});

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.access_time, color: Colors.white38, size: 14),
            const SizedBox(width: 6),
            Text(formatDate(report.createdAt),
                style: const TextStyle(color: Colors.white54, fontSize: 13)),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🔍 Espion', style: TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(report.attackerVillage?.name ?? '—',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                Text(report.attackerVillage?.playerName ?? '—',
                    style: const TextStyle(color: Colors.white54, fontSize: 11)),
              ],
            )),
            Container(width: 1, height: 48, color: Colors.white12,
                margin: const EdgeInsets.symmetric(horizontal: 12)),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🏰 Cible', style: TextStyle(color: Colors.blue, fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(report.defenderVillage?.name ?? '—',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                Text(report.defenderVillage?.playerName ?? '—',
                    style: const TextStyle(color: Colors.white54, fontSize: 11)),
                if (report.defenderVillage != null)
                  Text('(${report.defenderVillage!.x}, ${report.defenderVillage!.y})',
                      style: const TextStyle(color: Colors.white24, fontSize: 10)),
              ],
            )),
          ]),
        ],
      ),
    );
  }
}

// ── Carte éclaireurs (pertes) ──
class _ScoutsCard extends StatelessWidget {
  final ScoutReportDto report;
  const _ScoutsCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final pct = report.survivorRatio;
    final color = pct > 0.7
        ? Colors.green
        : pct > 0.5
            ? Colors.amber
            : pct > 0
                ? Colors.orange
                : Colors.red;

    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🔍 Éclaireurs envoyés',
              style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _ScoutStat(label: 'Envoyés',   value: report.scoutsSent,    color: Colors.white70),
            _ScoutStat(label: 'Perdus',    value: report.scoutsLost,    color: Colors.red),
            _ScoutStat(label: 'Revenus',   value: report.scoutsSurvived,color: Colors.green),
          ]),
          if (report.scoutsSurvived > 0) ...[
            const SizedBox(height: 10),
            const Divider(color: Colors.white12, height: 1),
            const SizedBox(height: 10),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Éclaireurs éliminés',
                  style: TextStyle(color: Colors.white54, fontSize: 11)),
              Text('${report.defenderScoutsKilled}',
                  style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 13)),
            ]),
          ],
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Taux de survie', style: TextStyle(color: Colors.white54, fontSize: 11)),
            Text('${(pct * 100).toStringAsFixed(0)}%',
                style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
          ]),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 6,
              backgroundColor: Colors.white12,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoutStat extends StatelessWidget {
  final String label;
  final int    value;
  final Color  color;
  const _ScoutStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(children: [
    Text('$value', style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
    Text(label,    style: const TextStyle(color: Colors.white38, fontSize: 10)),
  ]);
}

// ── Ressources (palier 1) ──
class _ResourcesCard extends StatelessWidget {
  final ScoutReportDto report;
  const _ResourcesCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final r = report.resources ?? {};
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('💰 Ressources',
              style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _ResourceItem(icon: '🪵', label: 'Bois',    value: r['wood']  ?? 0),
            _ResourceItem(icon: '🪨', label: 'Pierre',  value: r['stone'] ?? 0),
            _ResourceItem(icon: '⚙️', label: 'Fer',     value: r['iron']  ?? 0),
          ]),
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
  Widget build(BuildContext context) => Column(children: [
    Text(icon, style: const TextStyle(fontSize: 20)),
    const SizedBox(height: 4),
    Text('$value', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
    Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10)),
  ]);
}

// ── Troupes (palier 1 et 3) ──
class _TroopsCard extends StatelessWidget {
  final String                  title;
  final Map<String, int>        troops;
  final String Function(String) unitLabel;
  final Color                   color;

  const _TroopsCard({
    required this.title,
    required this.troops,
    required this.unitLabel,
    this.color = Colors.blue,
  });

  @override
  Widget build(BuildContext context) {
    if (troops.isEmpty) {
      return _Card(
        child: Row(children: [
          Icon(Icons.info_outline, color: color.withOpacity(0.6), size: 16),
          const SizedBox(width: 8),
          Text('$title — Aucune troupe',
              style: const TextStyle(color: Colors.white38, fontSize: 12)),
        ]),
      );
    }

    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 10),
          Row(children: const [
            Expanded(flex: 4, child: Text('Unité',   style: TextStyle(color: Colors.white38, fontSize: 11))),
            Expanded(flex: 2, child: Text('Nombre',  style: TextStyle(color: Colors.white38, fontSize: 11), textAlign: TextAlign.center)),
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
        ],
      ),
    );
  }
}

// ── Bâtiments (palier 2) ──
class _BuildingsCard extends StatelessWidget {
  final Map<String, int>        buildings;
  final String Function(String) buildingLabel;

  const _BuildingsCard({required this.buildings, required this.buildingLabel});

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
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
      ),
    );
  }
}

// ── Carte générique ──
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

// ── Bannière défenseur ──
class _DefenderBanner extends StatelessWidget {
  final ScoutReportDto report;
  const _DefenderBanner({required this.report});

  @override
  Widget build(BuildContext context) {
    final detected = report.scoutsLost > 0;
    final color = detected ? Colors.orange : Colors.blue;
    final label = detected
        ? '🛡️ Espion détecté — ${report.scoutsLost} éclaireur(s) ennemi(s) tué(s)'
        : '👁️ Votre village a été espionné';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5), width: 1.5),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center),
    );
  }
}

// ── En-tête défenseur ──
class _DefenderHeaderCard extends StatelessWidget {
  final ScoutReportDto        report;
  final String Function(DateTime) formatDate;
  const _DefenderHeaderCard({required this.report, required this.formatDate});

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.access_time, color: Colors.white38, size: 14),
            const SizedBox(width: 6),
            Text(formatDate(report.createdAt),
                style: const TextStyle(color: Colors.white54, fontSize: 13)),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            const Icon(Icons.visibility, color: Colors.orange, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Espionné par',
                      style: TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(report.attackerVillage?.name ?? '—',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(report.attackerVillage?.playerName ?? '—',
                      style: const TextStyle(color: Colors.white54, fontSize: 11)),
                ],
              ),
            ),
          ]),
        ],
      ),
    );
  }
}

// ── Éclaireurs tués par la défense ──
class _DefenderScoutsKilledCard extends StatelessWidget {
  final ScoutReportDto report;
  const _DefenderScoutsKilledCard({required this.report});

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🔍 Éclaireurs',
              style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _DefenderScoutStat(
              label: 'Ennemis tués',
              value: report.scoutsLost,
              color: Colors.green,
            ),
            _DefenderScoutStat(
              label: 'Vos scouts perdus',
              value: report.defenderScoutsKilled,
              color: Colors.red,
            ),
          ]),
        ],
      ),
    );
  }
}

class _DefenderScoutStat extends StatelessWidget {
  final String label;
  final int    value;
  final Color  color;
  const _DefenderScoutStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(children: [
    Text('$value', style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold)),
    const SizedBox(height: 4),
    Text(label, style: const TextStyle(color: Colors.white38, fontSize: 11)),
  ]);
}
