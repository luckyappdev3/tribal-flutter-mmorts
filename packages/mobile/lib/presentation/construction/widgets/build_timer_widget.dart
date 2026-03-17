import 'dart:async';
import 'package:flutter/material.dart';
import '../../../data/dto/village_dto.dart';

class BuildTimerWidget extends StatefulWidget {
  final BuildQueueDto queue;

  const BuildTimerWidget({super.key, required this.queue});

  @override
  State<BuildTimerWidget> createState() => _BuildTimerWidgetState();
}

class _BuildTimerWidgetState extends State<BuildTimerWidget> {
  late Timer _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(_updateRemaining);
    });
  }

  void _updateRemaining() {
    final diff = widget.queue.endsAt.difference(DateTime.now());
    _remaining = diff.isNegative ? Duration.zero : diff;
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _format(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return d.inHours > 0 ? '$h:$m:$s' : '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final buildingName = BuildingInstanceDto.displayNames[widget.queue.buildingId]
        ?? widget.queue.buildingId;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
      decoration: BoxDecoration(
        color: const Color(0xFF2A2A1A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.construction, color: Colors.amber, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$buildingName → Niv. ${widget.queue.targetLevel}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  _remaining == Duration.zero ? 'Terminé !' : 'Fin dans ${_format(_remaining)}',
                  style: TextStyle(
                    color: _remaining == Duration.zero ? Colors.green : Colors.amber,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
