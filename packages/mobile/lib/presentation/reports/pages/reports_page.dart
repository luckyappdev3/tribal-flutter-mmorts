import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/reports_bloc.dart';
import '../bloc/reports_event.dart';
import '../bloc/reports_state.dart';
import '../../troops/dto/troops_dto.dart';
import 'report_detail_page.dart';
import 'scout_report_detail_page.dart';

class ReportsPage extends StatelessWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ReportsView();
  }
}

class _ReportsView extends StatelessWidget {
  const _ReportsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111111),
      appBar: AppBar(
        title: BlocBuilder<ReportsBloc, ReportsState>(
          builder: (context, state) {
            final unread = state.maybeWhen(
              loaded: (_, __, ___, u) => u,
              orElse: () => 0,
            );
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Rapports', style: TextStyle(fontWeight: FontWeight.bold)),
                if (unread > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$unread',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
        backgroundColor: Colors.black87,
        elevation: 0,
        centerTitle: true,
        actions: [
          BlocBuilder<ReportsBloc, ReportsState>(
            builder: (context, state) {
              final hasUnread = state.maybeWhen(
                loaded: (_, __, ___, u) => u > 0,
                orElse: () => false,
              );
              if (!hasUnread) return const SizedBox.shrink();
              return TextButton(
                onPressed: () => context.read<ReportsBloc>().add(const ReportsEvent.markAllRead()),
                child: const Text('Tout lire', style: TextStyle(color: Colors.amber, fontSize: 12)),
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<ReportsBloc, ReportsState>(
        builder: (context, state) {
          return state.when(
            initial: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            error:   (msg) => Center(child: Text(msg, style: const TextStyle(color: Colors.red))),
            loaded:  (villageId, reports, scoutReports, _) {
              // Fusionner et trier par date décroissante
              final allItems = <_ReportEntry>[
                for (final r in reports)      _ReportEntry.attack(r),
                for (final r in scoutReports) _ReportEntry.scout(r),
              ]..sort((a, b) => b.createdAt.compareTo(a.createdAt));

              if (allItems.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.article_outlined, size: 64, color: Colors.white12),
                      SizedBox(height: 16),
                      Text('Aucun rapport', style: TextStyle(color: Colors.white38, fontSize: 16)),
                      SizedBox(height: 8),
                      Text('Lancez une attaque ou un espionnage depuis la carte',
                          style: TextStyle(color: Colors.white24, fontSize: 13)),
                    ],
                  ),
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: allItems.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, color: Colors.white12, indent: 16, endIndent: 16),
                itemBuilder: (context, index) {
                  final entry = allItems[index];
                  if (entry.isScout) {
                    return _ScoutReportListItem(
                      report:    entry.scout!,
                      villageId: villageId,
                      onTap: () {
                        context.read<ReportsBloc>().add(ReportsEvent.markRead(entry.scout!.id));
                        Navigator.push(context, MaterialPageRoute(
                          builder: (_) => ScoutReportDetailPage(
                            report:      entry.scout!,
                            myVillageId: villageId,
                          ),
                        ));
                      },
                    );
                  }
                  return _ReportListItem(
                    report:    entry.attack!,
                    villageId: villageId,
                    onTap: () {
                      context.read<ReportsBloc>().add(ReportsEvent.markRead(entry.attack!.id));
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => ReportDetailPage(
                          report:      entry.attack!,
                          myVillageId: villageId,
                        ),
                      ));
                    },
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}

class _ReportListItem extends StatelessWidget {
  final AttackReportDto report;
  final String          villageId;
  final VoidCallback    onTap;

  const _ReportListItem({
    required this.report,
    required this.villageId,
    required this.onTap,
  });

  bool get _isAttacker => report.isAttacker(villageId);
  bool get _won        => _isAttacker ? report.attackerWon : !report.attackerWon;
  Color get _resultColor => _won ? Colors.green : Colors.red;

  String get _typeLabel =>
      _isAttacker ? 'Attaque envoyée' : 'Attaque reçue';

  String get _resultLabel {
    if (_isAttacker && _won)  return 'Victoire';
    if (_isAttacker && !_won) return 'Défaite';
    if (!_isAttacker && _won) return 'Défense réussie';
    return 'Village pillé';
  }

  String get _opponentName {
    if (_isAttacker) {
      return report.defenderVillage?.displayName ??
             report.defenderVillageId.substring(0, 8);
    }
    return report.attackerVillage?.name ??
           report.attackerVillageId.substring(0, 8);
  }

  String get _opponentPlayer {
    if (_isAttacker) {
      return report.defenderVillage?.isAbandoned == true
          ? 'Village abandonné'
          : (report.defenderVillage?.playerName ?? '—');
    }
    return report.attackerVillage?.playerName ?? '—';
  }

  String _formatDate(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1)  return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes}min';
    if (diff.inHours   < 24) return 'Il y a ${diff.inHours}h';
    return '${dt.day.toString().padLeft(2,'0')}/${dt.month.toString().padLeft(2,'0')} '
           '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
  }

  @override
  Widget build(BuildContext context) {
    final loot     = report.resourcesLooted;
    final wood     = loot['wood']  ?? 0;
    final stone    = loot['stone'] ?? 0;
    final iron     = loot['iron']  ?? 0;
    final hasLoot  = _isAttacker && _won && report.totalLooted > 0;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        color: report.isRead ? Colors.transparent : const Color(0xFF1A1A00),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // ── Barre lu/non-lu ──
            Container(
              width: 3,
              height: hasLoot ? 70 : 52,
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: report.isRead ? Colors.transparent : _resultColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // ── Icône résultat ──
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(
                color: _resultColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _isAttacker
                    ? (_won ? Icons.emoji_events : Icons.close)
                    : (_won ? Icons.shield      : Icons.warning_amber),
                color: _resultColor,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),

            // ── Infos ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type + résultat
                  Row(
                    children: [
                      Text(_typeLabel,
                          style: const TextStyle(color: Colors.white38, fontSize: 10)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: _resultColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(_resultLabel,
                            style: TextStyle(
                              color:      _resultColor,
                              fontSize:   10,
                              fontWeight: FontWeight.bold,
                            )),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  // Nom village
                  Text(
                    _opponentName,
                    style: TextStyle(
                      color:      report.isRead ? Colors.white70 : Colors.white,
                      fontWeight: report.isRead ? FontWeight.normal : FontWeight.bold,
                      fontSize:   13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  // Joueur
                  Text(_opponentPlayer,
                      style: const TextStyle(color: Colors.white38, fontSize: 11)),

                  // ── Ressources pillées (3 colonnes) ──
                  if (hasLoot) ...[
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        _LootChip(icon: '🪵', value: wood,  color: const Color(0xFF8D6E63)),
                        const SizedBox(width: 8),
                        _LootChip(icon: '🪨', value: stone, color: const Color(0xFF90A4AE)),
                        const SizedBox(width: 8),
                        _LootChip(icon: '⚙️', value: iron,  color: const Color(0xFF78909C)),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // ── Date + chevron ──
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_formatDate(report.createdAt),
                    style: const TextStyle(color: Colors.white24, fontSize: 10)),
                const SizedBox(height: 4),
                const Icon(Icons.chevron_right, color: Colors.white12, size: 16),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Union locale : entrée de liste (attaque ou scout) ──
class _ReportEntry {
  final AttackReportDto? attack;
  final ScoutReportDto?  scout;

  const _ReportEntry.attack(this.attack) : scout = null;
  const _ReportEntry.scout(this.scout)   : attack = null;

  bool get isScout  => scout  != null;
  DateTime get createdAt => isScout ? scout!.createdAt : attack!.createdAt;
}

// ── Item rapport scout ──
class _ScoutReportListItem extends StatelessWidget {
  final ScoutReportDto report;
  final String         villageId;
  final VoidCallback   onTap;

  const _ScoutReportListItem({
    required this.report,
    required this.villageId,
    required this.onTap,
  });

  bool get _isDefender => report.isDefenderReport;

  Color get _tierColor {
    if (_isDefender)       return Colors.orange;
    if (report.tier == 0)  return Colors.red;
    if (report.tier >= 3)  return Colors.amber;
    return Colors.orange;
  }

  String get _tierLabel {
    if (_isDefender)       return 'Espionné';
    if (report.tier == 0)  return 'Échec';
    if (report.tier >= 3)  return 'Palier 3';
    if (report.tier == 2)  return 'Palier 2';
    return 'Palier 1';
  }

  String _formatDate(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1)  return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes}min';
    if (diff.inHours   < 24) return 'Il y a ${diff.inHours}h';
    return '${dt.day.toString().padLeft(2,'0')}/${dt.month.toString().padLeft(2,'0')} '
           '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
  }

  @override
  Widget build(BuildContext context) {
    final color = _tierColor;

    // Côté attaquant : on montre le village cible
    // Côté défenseur : on montre le village espion (attaquant)
    final opponentName = _isDefender
        ? (report.attackerVillage?.name ?? report.attackerVillageId.substring(0, 8))
        : (report.defenderVillage?.name ?? report.defenderVillageId.substring(0, 8));
    final opponentPlayer = _isDefender
        ? (report.attackerVillage?.playerName ?? '—')
        : (report.defenderVillage?.playerName ?? '—');
    final typeLabel = _isDefender ? 'Village espionné' : 'Espionnage';

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        color: report.isRead ? Colors.transparent : const Color(0xFF001A10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Barre lu/non-lu
            Container(
              width: 3, height: 52,
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: report.isRead ? Colors.transparent : color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Icône
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _isDefender ? Icons.visibility : Icons.search,
                color: color, size: 18,
              ),
            ),
            const SizedBox(width: 12),
            // Infos
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Text(typeLabel, style: const TextStyle(color: Colors.white38, fontSize: 10)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(_tierLabel,
                          style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ]),
                  const SizedBox(height: 3),
                  Text(opponentName,
                      style: TextStyle(
                        color:      report.isRead ? Colors.white70 : Colors.white,
                        fontWeight: report.isRead ? FontWeight.normal : FontWeight.bold,
                        fontSize:   13,
                      ),
                      overflow: TextOverflow.ellipsis),
                  Text(opponentPlayer,
                      style: const TextStyle(color: Colors.white38, fontSize: 11)),
                ],
              ),
            ),
            // Date + chevron
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_formatDate(report.createdAt),
                    style: const TextStyle(color: Colors.white24, fontSize: 10)),
                const SizedBox(height: 4),
                const Icon(Icons.chevron_right, color: Colors.white12, size: 16),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Chip ressource pillée ──
class _LootChip extends StatelessWidget {
  final String icon;
  final int    value;
  final Color  color;
  const _LootChip({required this.icon, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(icon, style: const TextStyle(fontSize: 11)),
        const SizedBox(width: 2),
        Text(
          '$value',
          style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}