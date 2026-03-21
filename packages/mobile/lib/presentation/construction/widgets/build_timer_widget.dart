import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../data/dto/village_dto.dart';
import '../bloc/construction_bloc.dart';
import '../bloc/construction_event.dart';

class BuildTimerWidget extends StatefulWidget {
  final dynamic queue;   // BuildQueueDto ou BuildQueueItemDto
  final bool isActive;   // true = en cours (slot 1), false = en attente (slot 2)

  const BuildTimerWidget({
    super.key,
    required this.queue,
    this.isActive = true,
  });

  @override
  State<BuildTimerWidget> createState() => _BuildTimerWidgetState();
}

class _BuildTimerWidgetState extends State<BuildTimerWidget> {
  late Timer _timer;
  late Duration _remaining;

  // Nombre de tentatives de rechargement déjà faites
  int _reloadAttempts = 0;
  static const int _maxReloadAttempts = 5;
  static const int _reloadDelaySeconds = 3;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(_updateRemaining);

      // Quand le timer atteint zéro, déclencher le rechargement
      if (_remaining == Duration.zero && widget.isActive) {
        _scheduleReload();
      }
    });
  }

  void _updateRemaining() {
    final diff = widget.queue.endsAt.difference(DateTime.now());
    _remaining = diff.isNegative ? Duration.zero : diff;
  }

  void _scheduleReload() {
    // Ne pas dépasser le nombre max de tentatives
    if (_reloadAttempts >= _maxReloadAttempts) return;
    // Ne replanifier qu'une fois par tick (évite les appels multiples)
    if (_reloadAttempts > 0) return;

    _reloadAttempts++;
    Future.delayed(const Duration(seconds: _reloadDelaySeconds), () {
      if (!mounted) return;
      context.read<ConstructionBloc>().add(
        const ConstructionEvent.buildFinished({}),
      );
    });
  }

  @override
  void didUpdateWidget(BuildTimerWidget old) {
    super.didUpdateWidget(old);
    // Si un nouveau bâtiment différent arrive, reset tout
    if (old.queue.buildingId != widget.queue.buildingId ||
        old.queue.endsAt != widget.queue.endsAt) {
      _reloadAttempts = 0;
      _updateRemaining();
    }
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
    final buildingName =
        BuildingInstanceDto.displayNames[widget.queue.buildingId as String] ??
        (widget.queue.buildingId as String);

    final isDone    = _remaining == Duration.zero && widget.isActive;
    final isPending = !widget.isActive;

    final borderColor = isDone
        ? Colors.green.withOpacity(0.5)
        : isPending
            ? Colors.white12
            : Colors.amber.withOpacity(0.4);

    final bgColor = isDone
        ? const Color(0xFF1A2A1A)
        : isPending
            ? const Color(0xFF1E1E1E)
            : const Color(0xFF2A2A1A);

    // Message selon les tentatives
    String statusText;
    if (isDone) {
      statusText = _reloadAttempts >= _maxReloadAttempts
          ? 'Finalisé — actualise manuellement'
          : 'Terminé ! Finalisation...';
    } else if (isPending) {
      statusText = 'En attente...';
    } else {
      statusText = 'Fin dans ${_format(_remaining)}';
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 6, 16, 0),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 24, height: 24,
            margin: const EdgeInsets.only(right: 10),
            decoration: BoxDecoration(
              color: isPending ? Colors.white10 : Colors.amber.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                isPending ? '2' : '1',
                style: TextStyle(
                  color: isPending ? Colors.white38 : Colors.amber,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          Icon(
            isDone
                ? Icons.check_circle_outline
                : isPending
                    ? Icons.hourglass_top_outlined
                    : Icons.construction,
            color: isDone
                ? Colors.green
                : isPending ? Colors.white38 : Colors.amber,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$buildingName → Niv. ${widget.queue.targetLevel}',
                  style: TextStyle(
                    color: isPending ? Colors.white54 : Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  statusText,
                  style: TextStyle(
                    color: isDone
                        ? Colors.greenAccent
                        : isPending ? Colors.white24 : Colors.amber,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // Spinner seulement si finalisation en cours (pas si max atteint)
          if (isDone && _reloadAttempts < _maxReloadAttempts)
            const SizedBox(
              width: 14, height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 1.5, color: Colors.greenAccent,
              ),
            ),
        ],
      ),
    );
  }
}
