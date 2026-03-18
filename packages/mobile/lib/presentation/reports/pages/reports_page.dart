import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/troops_api.dart';
import '../../troops/dto/troops_dto.dart';

class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key});

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  final TroopsApi _troopsApi = getIt<TroopsApi>();

  List<AttackReportDto> _reports = [];
  bool _loading = true;
  String? _error;
  String _villageId = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final villageId = Hive.box('village').get('current_village_id') as String?;
    if (villageId == null) return;
    _villageId = villageId;
    try {
      final reports = await _troopsApi.getReports(villageId);
      setState(() { _reports = reports; _loading = false; });
    } catch (e) {
      setState(() { _loading = false; _error = '$e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: const Text('Rapports de Combat', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.amber),
            onPressed: () { setState(() => _loading = true); _load(); },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Colors.amber))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _reports.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.article_outlined, size: 64, color: Colors.white24),
                          const SizedBox(height: 16),
                          const Text('Aucun rapport', style: TextStyle(color: Colors.white54, fontSize: 16)),
                          const SizedBox(height: 8),
                          const Text('Lancez une attaque depuis la carte',
                              style: TextStyle(color: Colors.white24, fontSize: 13)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(14),
                      itemCount: _reports.length,
                      itemBuilder: (context, index) => _ReportCard(
                        report:    _reports[index],
                        villageId: _villageId,
                      ),
                    ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final AttackReportDto report;
  final String          villageId;

  const _ReportCard({required this.report, required this.villageId});

  bool get _isAttacker => report.isAttacker(villageId);
  bool get _won => _isAttacker ? report.attackerWon : !report.attackerWon;

  @override
  Widget build(BuildContext context) {
    final color = _won ? Colors.green : Colors.red;

    return GestureDetector(
      onTap: () => _showDetail(context),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF222222),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            // ── Icône résultat ──
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _won ? Icons.emoji_events : Icons.shield_outlined,
                color: color,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),

            // ── Infos ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isAttacker ? 'Attaque envoyée' : 'Attaque reçue',
                    style: const TextStyle(color: Colors.white54, fontSize: 11),
                  ),
                  Text(
                    _won ? 'Victoire' : 'Défaite',
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  if (_isAttacker && report.attackerWon)
                    Text(
                      '🪵${report.resourcesLooted['wood'] ?? 0} '
                      '🪨${report.resourcesLooted['stone'] ?? 0} '
                      '⚙️${report.resourcesLooted['iron'] ?? 0} pillés',
                      style: const TextStyle(color: Colors.amber, fontSize: 11),
                    ),
                ],
              ),
            ),

            // ── Date ──
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '+${report.pointsGained} pts',
                  style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatDate(report.createdAt),
                  style: const TextStyle(color: Colors.white38, fontSize: 10),
                ),
                const Icon(Icons.chevron_right, color: Colors.white24, size: 16),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF222222),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ReportDetail(report: report, isAttacker: _isAttacker),
    );
  }
}

class _ReportDetail extends StatelessWidget {
  final AttackReportDto report;
  final bool isAttacker;

  const _ReportDetail({required this.report, required this.isAttacker});

  @override
  Widget build(BuildContext context) {
    final won = isAttacker ? report.attackerWon : !report.attackerWon;
    final color = won ? Colors.green : Colors.red;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      expand: false,
      builder: (_, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          Center(
            child: Container(width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2))),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              won ? '🏆 Victoire !' : '💀 Défaite',
              style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 20),

          _Section(title: 'Unités envoyées', data: report.unitsSent),
          const SizedBox(height: 12),
          _Section(title: 'Unités survivantes', data: report.unitsSurvived),
          const SizedBox(height: 12),

          if (report.attackerWon && isAttacker) ...[
            _Section(title: 'Ressources pillées', data: {
              '🪵 Bois':  report.resourcesLooted['wood']  ?? 0,
              '🪨 Pierre': report.resourcesLooted['stone'] ?? 0,
              '⚙️ Fer':   report.resourcesLooted['iron']  ?? 0,
            }, useKeys: true),
            const SizedBox(height: 12),
          ],

          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Points ${isAttacker ? "gagnés" : "perdus"}',
                    style: const TextStyle(color: Colors.white70)),
                Text('${isAttacker ? "+" : "-"}${report.pointsGained}',
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Map<String, int> data;
  final bool useKeys;

  const _Section({required this.title, required this.data, this.useKeys = false});

  @override
  Widget build(BuildContext context) {
    final entries = data.entries.where((e) => e.value > 0).toList();
    if (entries.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(color: Colors.white54, fontSize: 12)),
        const SizedBox(height: 6),
        ...entries.map((e) => Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(useKeys ? e.key : e.key,
                  style: const TextStyle(color: Colors.white70, fontSize: 13)),
              Text('${e.value}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
        )),
      ],
    );
  }
}
