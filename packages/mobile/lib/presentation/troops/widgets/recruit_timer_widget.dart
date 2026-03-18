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
    final diff = widget.queue.endsAt.difference(DateTime.now());
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
    final icon = TroopDto.icons[widget.queue.unitType] ?? '⚔️';
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1A2A1A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Text(icon, style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Recrutement : ${widget.queue.count}× ${widget.queue.unitType}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  _remaining == Duration.zero ? 'Prêts !' : 'Fin dans ${_fmt(_remaining)}',
                  style: TextStyle(
                    color: _remaining == Duration.zero ? Colors.greenAccent : Colors.green[300],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.military_tech, color: Colors.green[300], size: 20),
        ],
      ),
    );
  }
}
