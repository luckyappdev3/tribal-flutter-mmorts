import 'dart:async';
import 'package:flutter/material.dart';
import '../dto/troops_dto.dart';

class RecruitTimerWidget extends StatefulWidget {
  final RecruitQueueDto queue;
  const RecruitTimerWidget({super.key, required this.queue});

  @override
  State<RecruitTimerWidget> createState() => _RecruitTimerWidgetState();
}

class _RecruitTimerWidgetState extends State<RecruitTimerWidget> {
  late Timer    _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _update();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(_update));
  }

  void _update() {
    final diff = widget.queue.nextUnitAt.difference(DateTime.now());
    _remaining = diff.isNegative ? Duration.zero : diff;
  }

  @override
  void dispose() { _timer.cancel(); super.dispose(); }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return d.inHours > 0 ? '${d.inHours}:$m:$s' : '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final q    = widget.queue;
    final icon = TroopDto.icons[q.unitType] ?? '⚔️';
    final pct  = q.totalCount > 0 ? q.trainedCount / q.totalCount : 0.0;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF1A2A1A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Bâtiment responsable
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  q.buildingLabel,
                  style: const TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              Text(icon, style: const TextStyle(fontSize: 18)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  '${q.remaining} × ${q.unitType}  (${q.trainedCount}/${q.totalCount})',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ),
              Text(
                _remaining == Duration.zero ? 'Prêt !' : _fmt(_remaining),
                style: TextStyle(
                  color: _remaining == Duration.zero ? Colors.greenAccent : Colors.green[300],
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Barre de progression
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value:           pct,
              minHeight:       4,
              backgroundColor: Colors.white12,
              valueColor:      const AlwaysStoppedAnimation<Color>(Colors.green),
            ),
          ),
        ],
      ),
    );
  }
}
