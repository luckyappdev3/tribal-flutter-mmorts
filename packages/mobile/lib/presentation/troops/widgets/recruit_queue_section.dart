import 'dart:async';
import 'package:flutter/material.dart';
import '../dto/troops_dto.dart';

// ─────────────────────────────────────────────────────────────────────────────
// RecruitQueueSection
// Affiche toutes les files de recrutement actives, groupées par bâtiment.
// Gère un timer local par file active + calcul du temps total dynamique.
// ─────────────────────────────────────────────────────────────────────────────
class RecruitQueueSection extends StatefulWidget {
  final List<RecruitQueueDto>               queues;
  final List<TroopDto>                      troops;
  final void Function(String queueId)       onCancel;

  const RecruitQueueSection({
    super.key,
    required this.queues,
    required this.troops,
    required this.onCancel,
  });

  @override
  State<RecruitQueueSection> createState() => _RecruitQueueSectionState();
}

class _RecruitQueueSectionState extends State<RecruitQueueSection> {
  late Timer _timer;

  // Compteurs locaux : queueId → remaining count
  late Map<String, int> _localRemaining;
  // Quand le prochain tick doit arriver pour chaque file active
  late Map<String, DateTime> _localNextUnitAt;

  @override
  void initState() {
    super.initState();
    _initLocal();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void didUpdateWidget(RecruitQueueSection old) {
    super.didUpdateWidget(old);
    // Resync quand le serveur pousse de nouvelles données
    _initLocal();
  }

  void _initLocal() {
    _localRemaining  = { for (final q in widget.queues) q.id: q.remaining };
    _localNextUnitAt = { for (final q in widget.queues) q.id: q.nextUnitAt };
  }

  void _tick() {
    if (!mounted) return;
    setState(() {
      // Pour chaque file active (première de chaque bâtiment)
      final activeIds = _activeQueueIds();
      for (final queueId in activeIds) {
        final nextAt = _localNextUnitAt[queueId];
        if (nextAt == null) continue;
        if (DateTime.now().isAfter(nextAt)) {
          final rem = (_localRemaining[queueId] ?? 1) - 1;
          if (rem <= 0) {
            _localRemaining[queueId] = 0;
          } else {
            _localRemaining[queueId] = rem;
            // Estimer le prochain tick : réutiliser la même durée
            final q = widget.queues.firstWhere((x) => x.id == queueId,
                orElse: () => widget.queues.first);
            final unitMs = _estimateUnitMs(q);
            _localNextUnitAt[queueId] = DateTime.now().add(Duration(milliseconds: unitMs));
          }
        }
      }
    });
  }

  // IDs des entrées actives (première par buildingType, triées par startsAt)
  Set<String> _activeQueueIds() {
    final seen = <String>{};
    final ids  = <String>{};
    for (final q in widget.queues) {
      if (seen.add(q.buildingType)) ids.add(q.id);
    }
    return ids;
  }

  // Estime la durée par unité en millisecondes
  int _estimateUnitMs(RecruitQueueDto q) {
    final diff = q.nextUnitAt.difference(DateTime.now());
    if (diff.inMilliseconds > 500) return diff.inMilliseconds;
    // Fallback : temps effectif depuis TroopDto (gamespeed + bâtiment déjà inclus)
    final troop = widget.troops.where((t) => t.unitType == q.unitType).firstOrNull;
    return ((troop?.effectiveRecruitTime ?? troop?.recruitTime ?? 60) * 1000).round();
  }

  // Temps total estimé pour toutes les files (en secondes)
  int _totalSeconds() {
    int total = 0;
    final activeIds = _activeQueueIds();
    for (final q in widget.queues) {
      final isActive   = activeIds.contains(q.id);
      final remaining  = _localRemaining[q.id] ?? q.remaining;
      if (remaining <= 0) continue;
      final unitMs = _estimateUnitMs(q);
      if (isActive) {
        final nextAt   = _localNextUnitAt[q.id] ?? q.nextUnitAt;
        final tillNext = nextAt.difference(DateTime.now()).inMilliseconds.clamp(0, unitMs);
        total += (tillNext / 1000).ceil();
        total += ((remaining - 1) * unitMs / 1000).ceil();
      } else {
        total += (remaining * unitMs / 1000).ceil();
      }
    }
    return total;
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.queues.isEmpty) return const SizedBox.shrink();

    // Grouper par bâtiment (ordre d'arrivée préservé)
    final grouped = <String, List<RecruitQueueDto>>{};
    for (final q in widget.queues) {
      grouped.putIfAbsent(q.buildingType, () => []).add(q);
    }

    final totalSecs = _totalSeconds();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Bandeau temps total ─────────────────────────────
        _TotalTimeBanner(totalSeconds: totalSecs),

        // ── Une carte par bâtiment ──────────────────────────
        ...grouped.entries.map((entry) {
          final buildingType = entry.key;
          final batches      = entry.value;
          final activeIds    = _activeQueueIds();
          return _BuildingQueueCard(
            buildingType:    buildingType,
            batches:         batches,
            localRemaining:  _localRemaining,
            localNextUnitAt: _localNextUnitAt,
            activeIds:       activeIds,
            troops:          widget.troops,
            onCancel:        widget.onCancel,
          );
        }),
        const SizedBox(height: 4),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bandeau « Temps total de recrutement »
// ─────────────────────────────────────────────────────────────────────────────
class _TotalTimeBanner extends StatelessWidget {
  final int totalSeconds;
  const _TotalTimeBanner({required this.totalSeconds});

  String _fmt(int s) {
    if (s <= 0) return '0s';
    final h = s ~/ 3600;
    final m = (s % 3600) ~/ 60;
    final sec = s % 60;
    if (h > 0) return '${h}h ${m.toString().padLeft(2,'0')}m ${sec.toString().padLeft(2,'0')}s';
    if (m > 0) return '${m}m ${sec.toString().padLeft(2,'0')}s';
    return '${sec}s';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1F0D),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.green.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.military_tech, color: Colors.green, size: 16),
          const SizedBox(width: 8),
          const Text(
            'Recrutement en cours',
            style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
          ),
          const Spacer(),
          const Text('Total : ', style: TextStyle(color: Colors.white38, fontSize: 11)),
          Text(
            _fmt(totalSeconds),
            style: const TextStyle(
              color: Colors.greenAccent,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Carte d'une file de bâtiment (ex: Caserne avec ses lots en attente)
// ─────────────────────────────────────────────────────────────────────────────
class _BuildingQueueCard extends StatelessWidget {
  final String                    buildingType;
  final List<RecruitQueueDto>     batches;
  final Map<String, int>          localRemaining;
  final Map<String, DateTime>     localNextUnitAt;
  final Set<String>               activeIds;
  final List<TroopDto>            troops;
  final void Function(String)     onCancel;

  const _BuildingQueueCard({
    required this.buildingType,
    required this.batches,
    required this.localRemaining,
    required this.localNextUnitAt,
    required this.activeIds,
    required this.troops,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final label = RecruitQueueDto.buildingLabels[buildingType] ?? buildingType;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 6, 16, 0),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1C),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête bâtiment
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
            child: Text(
              label.toUpperCase(),
              style: const TextStyle(
                color: Colors.white38,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
              ),
            ),
          ),
          const Divider(height: 1, color: Colors.white12),

          // Lignes de lots
          ...batches.asMap().entries.map((entry) {
            final idx      = entry.key;
            final batch    = entry.value;
            final isActive = activeIds.contains(batch.id);
            final rem      = localRemaining[batch.id] ?? batch.remaining;
            final nextAt   = localNextUnitAt[batch.id] ?? batch.nextUnitAt;
            final isLast   = idx == batches.length - 1;

            return _QueueRow(
              batch:     batch,
              isActive:  isActive,
              remaining: rem,
              nextUnitAt: nextAt,
              isLast:    isLast,
              troops:    troops,
              onCancel:  () => onCancel(batch.id),
            );
          }),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ligne d'un lot (active ou en attente)
// ─────────────────────────────────────────────────────────────────────────────
class _QueueRow extends StatelessWidget {
  final RecruitQueueDto batch;
  final bool            isActive;
  final int             remaining;
  final DateTime        nextUnitAt;
  final bool            isLast;
  final List<TroopDto>  troops;
  final VoidCallback    onCancel;

  const _QueueRow({
    required this.batch,
    required this.isActive,
    required this.remaining,
    required this.nextUnitAt,
    required this.isLast,
    required this.troops,
    required this.onCancel,
  });

  String _fmtCountdown() {
    final diff = nextUnitAt.difference(DateTime.now());
    if (diff.isNegative || diff.inSeconds == 0) return '0s';
    final m = diff.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = diff.inSeconds.remainder(60).toString().padLeft(2, '0');
    return diff.inHours > 0 ? '${diff.inHours}:$m:$s' : '$m:$s';
  }

  double _progress() {
    if (batch.totalCount <= 0) return 0;
    final trained = batch.totalCount - remaining;
    return (trained / batch.totalCount).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    final icon  = TroopDto.icons[batch.unitType] ?? '⚔️';
    final name  = TroopDto.names[batch.unitType] ?? batch.unitType;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: [
              // Indicateur actif / attente
              Container(
                width: 4,
                height: 36,
                decoration: BoxDecoration(
                  color: isActive ? Colors.green : Colors.white12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),

              // Icône unité
              Text(icon, style: TextStyle(
                fontSize: 20,
                color: isActive ? null : Colors.white38,
              )),
              const SizedBox(width: 10),

              // Nom + quantité
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Text(
                        name,
                        style: TextStyle(
                          color: isActive ? Colors.white : Colors.white38,
                          fontSize: 12,
                          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '×$remaining',
                        style: TextStyle(
                          color: isActive ? Colors.greenAccent : Colors.white24,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (!isActive) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Attente',
                            style: TextStyle(color: Colors.white24, fontSize: 9),
                          ),
                        ),
                      ],
                    ]),

                    if (isActive) ...[
                      const SizedBox(height: 4),
                      // Barre de progression + countdown
                      Row(children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(2),
                            child: LinearProgressIndicator(
                              value:           _progress(),
                              minHeight:       3,
                              backgroundColor: Colors.white12,
                              valueColor:      const AlwaysStoppedAnimation<Color>(Colors.green),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _fmtCountdown(),
                          style: const TextStyle(
                            color: Colors.greenAccent,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ]),
                    ],
                  ],
                ),
              ),

              // Bouton annuler
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () => _confirmCancel(context),
                child: Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: const Icon(Icons.close, color: Colors.redAccent, size: 14),
                ),
              ),
            ],
          ),
        ),
        if (!isLast) const Divider(height: 1, indent: 12, endIndent: 12, color: Colors.white12),
      ],
    );
  }

  void _confirmCancel(BuildContext context) {
    final name = TroopDto.names[batch.unitType] ?? batch.unitType;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF222222),
        title: const Text('Annuler le recrutement', style: TextStyle(color: Colors.white, fontSize: 15)),
        content: Text(
          'Annuler $remaining× $name ?\nLes ressources non utilisées seront remboursées.',
          style: const TextStyle(color: Colors.white70, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Non', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red[800]),
            onPressed: () { Navigator.pop(ctx); onCancel(); },
            child: const Text('Annuler', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
