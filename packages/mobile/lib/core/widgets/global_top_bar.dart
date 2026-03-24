import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../resources/global_resources_cubit.dart';

class GlobalTopBar extends StatelessWidget {
  const GlobalTopBar({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GlobalResourcesCubit, GlobalResourcesState>(
      builder: (context, s) {
        if (!s.isLoaded) {
          return Container(
            height: 52,
            color: Colors.black87,
            child: const Center(
              child: SizedBox(
                width: 16, height: 16,
                child: CircularProgressIndicator(
                  color: Colors.amber, strokeWidth: 2,
                ),
              ),
            ),
          );
        }

        return Container(
          color: Colors.black87,
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Row(
            children: [
              _ResCol(
                icon:  Icons.forest,
                color: const Color(0xFF8D6E63),
                value: s.wood,
                rate:  s.woodRate,
                max:   s.maxStorage,
              ),
              _ResCol(
                icon:  Icons.terrain,
                color: const Color(0xFF90A4AE),
                value: s.stone,
                rate:  s.stoneRate,
                max:   s.maxStorage,
              ),
              _ResCol(
                icon:  Icons.hardware,
                color: const Color(0xFF78909C),
                value: s.iron,
                rate:  s.ironRate,
                max:   s.maxStorage,
              ),
              _PopCol(used: s.popUsed, max: s.popMax),
            ],
          ),
        );
      },
    );
  }
}

// ── Colonne ressource ─────────────────────────────────────────────
class _ResCol extends StatelessWidget {
  final IconData icon;
  final Color    color;
  final double   value, rate, max;

  const _ResCol({
    required this.icon,
    required this.color,
    required this.value,
    required this.rate,
    required this.max,
  });

  bool get _isFull => value >= max;

  String _fmt(int v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 10000)   return '${(v / 1000).toStringAsFixed(1)}k';
    return v.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(height: 2),
          Text(
            _fmt(value.floor()),
            style: TextStyle(
              color: _isFull ? Colors.redAccent : Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
            ),
          ),
          Text(
            _isFull ? 'PLEIN' : '+${rate.toStringAsFixed(1)}/s',
            style: TextStyle(
              color: _isFull ? Colors.redAccent : Colors.white38,
              fontSize: 9,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Colonne population ────────────────────────────────────────────
class _PopCol extends StatelessWidget {
  final int used, max;
  const _PopCol({required this.used, required this.max});

  bool get _isFull  => used >= max && max > 0;
  bool get _isHigh  => max > 0 && used / max >= 0.9;

  @override
  Widget build(BuildContext context) {
    final color = _isFull ? Colors.redAccent
        : _isHigh ? Colors.orangeAccent
        : Colors.tealAccent;

    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.people, color: color, size: 16),
          const SizedBox(height: 2),
          Text(
            '$used/$max',
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
            ),
          ),
          Text(
            'POP',
            style: const TextStyle(color: Colors.white38, fontSize: 9),
          ),
        ],
      ),
    );
  }
}
