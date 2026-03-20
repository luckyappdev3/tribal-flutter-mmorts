import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/reports_bloc.dart';
import '../bloc/reports_event.dart';
import '../bloc/reports_state.dart';
import '../../troops/dto/troops_dto.dart';
import 'report_detail_page.dart';

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
              loaded: (_, __, u) => u,
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
                loaded: (_, __, u) => u > 0,
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
            loaded:  (villageId, reports, _) {
              if (reports.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.article_outlined, size: 64, color: Colors.white12),
                      SizedBox(height: 16),
                      Text('Aucun rapport de combat',
                          style: TextStyle(color: Colors.white38, fontSize: 16)),
                      SizedBox(height: 8),
                      Text('Lancez une attaque depuis la carte',
                          style: TextStyle(color: Colors.white24, fontSize: 13)),
                    ],
                  ),
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: reports.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, color: Colors.white12, indent: 16, endIndent: 16),
                itemBuilder: (context, index) => _ReportListItem(
                  report:    reports[index],
                  villageId: villageId,
                  onTap: () {
                    context.read<ReportsBloc>().add(ReportsEvent.markRead(reports[index].id));
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ReportDetailPage(
                          report:      reports[index],
                          myVillageId: villageId,
                        ),
                      ),
                    );
                  },
                ),
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