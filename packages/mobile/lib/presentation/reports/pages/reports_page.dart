import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/reports_bloc.dart';
import '../bloc/reports_event.dart';
import '../bloc/reports_state.dart';
import '../../troops/dto/troops_dto.dart';
import 'combat_report_detail_page.dart';

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
      body: BlocBuilder<ReportsBloc, ReportsState>(
        builder: (context, state) {
          return state.when(
            initial: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            error:   (msg) => Center(child: Text(msg, style: const TextStyle(color: Colors.red))),
            loaded:  (villageId, reports, _) {
              if (reports.isEmpty) {
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

              final hasUnread = reports.any((r) => !r.isRead);
              return ListView.separated(
                padding: const EdgeInsets.only(top: 4, bottom: 8),
                itemCount: reports.length + (hasUnread ? 1 : 0),
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, color: Colors.white12, indent: 16, endIndent: 16),
                itemBuilder: (context, index) {
                  if (hasUnread && index == 0) {
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: () => context.read<ReportsBloc>().add(const ReportsEvent.markAllRead()),
                          icon: const Icon(Icons.done_all, size: 14, color: Colors.amber),
                          label: const Text('Tout lire', style: TextStyle(color: Colors.amber, fontSize: 12)),
                          style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4)),
                        ),
                      ),
                    );
                  }
                  final report = reports[hasUnread ? index - 1 : index];
                  return _CombatReportListItem(
                    report:    report,
                    villageId: villageId,
                    onTap: () {
                      context.read<ReportsBloc>().add(ReportsEvent.markRead(report.id));
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => CombatReportDetailPage(
                          report:      report,
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

class _CombatReportListItem extends StatelessWidget {
  final CombatReportDto report;
  final String          villageId;
  final VoidCallback    onTap;

  const _CombatReportListItem({
    required this.report,
    required this.villageId,
    required this.onTap,
  });

  bool get _isAttacker => report.isAttacker(villageId);

  // ── Titre de l'adversaire ──
  String get _opponentName {
    if (_isAttacker) {
      return report.defenderVillage?.displayName ?? report.defenderVillageId.substring(0, 8);
    }
    return report.attackerVillage?.name ?? report.attackerVillageId.substring(0, 8);
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

  // ── Badge(s) principal(aux) ──
  List<_Badge> get _badges {
    final badges = <_Badge>[];

    // Badge combat
    if (report.hasCombat && report.attackerWon != null) {
      final won = _isAttacker ? report.attackerWon! : !report.attackerWon!;
      final totalSent     = report.unitsSent?.values.fold(0, (s, v) => s + v) ?? 0;
      final totalSurvived = report.unitsSurvived?.values.fold(0, (s, v) => s + v) ?? 0;
      final mutual        = totalSurvived == 0 && totalSent > 0 &&
          (report.defenderUnitsBefore?.values.fold(0, (s, v) => s + v) ?? 0) > 0 &&
          (report.defenderUnitsAfter?.values.fold(0, (s, v) => s + v) ?? 0) == 0;

      if (mutual && _isAttacker) {
        badges.add(_Badge('Anéant. mutuel', Colors.orange));
      } else if (won) {
        badges.add(_Badge(_isAttacker ? 'Victoire' : 'Défense', Colors.green));
      } else {
        badges.add(_Badge(_isAttacker ? 'Défaite' : 'Pillé', Colors.red));
      }
    }

    // Badge scout
    if (report.hasScout && !report.isDefenderReport) {
      final tier = report.tier!;
      final (label, color) = switch (tier) {
        0 => ('Échec espion', Colors.red),
        1 => ('Palier 1', Colors.orange),
        2 => ('Palier 2', Colors.amber),
        _ => ('Palier 3', Colors.green),
      };
      badges.add(_Badge(label, color));
    }

    // Rapport côté défenseur d'espionnage
    if (report.hasScout && report.isDefenderReport && !report.hasCombat) {
      badges.add(_Badge('Espionné', Colors.orange));
    }

    return badges;
  }

  // ── Icône principale ──
  (IconData, Color) get _icon {
    if (report.type == 'scout' && !report.hasCombat) {
      return report.isDefenderReport
          ? (Icons.visibility, Colors.orange)
          : (Icons.search, _badges.firstOrNull?.color ?? Colors.amber);
    }
    if (!report.hasCombat) return (Icons.search, Colors.amber);
    final won = _isAttacker ? report.attackerWon! : !report.attackerWon!;
    if (_isAttacker) {
      return won ? (Icons.emoji_events, Colors.green) : (Icons.close, Colors.red);
    } else {
      return won ? (Icons.shield, Colors.green) : (Icons.warning_amber, Colors.red);
    }
  }

  // ── Libellé du type ──
  String get _typeLabel {
    if (report.type == 'combined') {
      return _isAttacker ? 'Attaque + espionnage' : 'Attaque reçue';
    }
    if (report.type == 'scout') {
      return report.isDefenderReport ? 'Village espionné' : 'Espionnage';
    }
    return _isAttacker ? 'Attaque envoyée' : 'Attaque reçue';
  }

  @override
  Widget build(BuildContext context) {
    final (iconData, iconColor) = _icon;
    final hasLoot = report.hasCombat && _isAttacker &&
        (report.attackerWon ?? false) && report.totalLooted > 0;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        color: report.isRead ? Colors.transparent : const Color(0xFF1A1A00),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Barre lu/non-lu
            Container(
              width: 3,
              height: hasLoot ? 70 : 52,
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: report.isRead ? Colors.transparent : iconColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Icône
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(iconData, color: iconColor, size: 18),
            ),
            const SizedBox(width: 12),
            // Infos
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type + badge(s)
                  Row(children: [
                    Text(_typeLabel,
                        style: const TextStyle(color: Colors.white38, fontSize: 10)),
                    const SizedBox(width: 6),
                    ..._badges.map((b) => Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: b.color.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(b.label,
                            style: TextStyle(
                              color: b.color, fontSize: 10, fontWeight: FontWeight.bold,
                            )),
                      ),
                    )),
                  ]),
                  const SizedBox(height: 3),
                  // Village
                  Text(
                    _opponentName,
                    style: TextStyle(
                      color:      report.isRead ? Colors.white70 : Colors.white,
                      fontWeight: report.isRead ? FontWeight.normal : FontWeight.bold,
                      fontSize:   13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(_opponentPlayer,
                      style: const TextStyle(color: Colors.white38, fontSize: 11)),
                  // Loot
                  if (hasLoot) ...[
                    const SizedBox(height: 5),
                    Row(children: [
                      _LootChip(icon: '🪵', value: report.resourcesLooted?['wood']  ?? 0, color: const Color(0xFF8D6E63)),
                      const SizedBox(width: 8),
                      _LootChip(icon: '🪨', value: report.resourcesLooted?['stone'] ?? 0, color: const Color(0xFF90A4AE)),
                      const SizedBox(width: 8),
                      _LootChip(icon: '⚙️', value: report.resourcesLooted?['iron']  ?? 0, color: const Color(0xFF78909C)),
                    ]),
                  ],
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

class _Badge {
  final String label;
  final Color  color;
  const _Badge(this.label, this.color);
}

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
        Text('$value',
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
