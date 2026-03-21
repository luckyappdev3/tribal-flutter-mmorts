import 'dart:async';
import 'package:flutter/material.dart';

// ─────────────────────────────────────────────────────────────
//  CountdownTimer — widget générique HH:MM:SS vers une date.
//
//  Différent du BuildTimerWidget existant (lié à BuildQueueDto).
//  Utilisable partout : mouvements, recrutement, etc.
//
//  Usage :
//    CountdownTimer(
//      endsAt: DateTime.parse(movement.arrivesAt),
//      onComplete: () { /* refresh */ },
//    )
// ─────────────────────────────────────────────────────────────

class CountdownTimer extends StatefulWidget {
  const CountdownTimer({
    super.key,
    required this.endsAt,
    this.onComplete,
    this.style,
    this.completedText = 'Terminé',
    this.completedStyle,
  });

  final DateTime     endsAt;
  final VoidCallback? onComplete;
  final TextStyle?   style;
  final String       completedText;
  final TextStyle?   completedStyle;

  @override
  State<CountdownTimer> createState() => _CountdownTimerState();
}

class _CountdownTimerState extends State<CountdownTimer> {
  Timer? _timer;
  Duration _remaining = Duration.zero;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final diff = widget.endsAt.difference(DateTime.now());
    if (diff.isNegative) {
      if (!_done) {
        _done = true;
        setState(() => _remaining = Duration.zero);
        widget.onComplete?.call();
      }
      return;
    }
    setState(() => _remaining = diff);
  }

  @override
  void didUpdateWidget(CountdownTimer old) {
    super.didUpdateWidget(old);
    if (old.endsAt != widget.endsAt) {
      _done = false;
      _tick();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return Text(
        widget.completedText,
        style: widget.completedStyle ??
            const TextStyle(
              color: Colors.greenAccent,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
      );
    }

    final h = _remaining.inHours;
    final m = _remaining.inMinutes.remainder(60);
    final s = _remaining.inSeconds.remainder(60);

    final text = h > 0
        ? '${_p(h)}:${_p(m)}:${_p(s)}'
        : '${_p(m)}:${_p(s)}';

    return Text(
      text,
      style: widget.style ??
          const TextStyle(
            color: Colors.amber,
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: FontWeight.bold,
          ),
    );
  }

  String _p(int n) => n.toString().padLeft(2, '0');
}
