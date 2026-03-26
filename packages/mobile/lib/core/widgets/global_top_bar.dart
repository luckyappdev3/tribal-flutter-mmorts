import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../resources/global_resources_cubit.dart';
import '../di/injection.dart';
import '../../data/remote/api/village_api.dart';
import '../../data/dto/village_dto.dart';

class GlobalTopBar extends StatelessWidget {
  const GlobalTopBar({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GlobalResourcesCubit, GlobalResourcesState>(
      builder: (context, s) {
        if (!s.isLoaded) {
          return Container(
            height: 72,
            color: Colors.black87,
            child: const Center(
              child: SizedBox(
                width: 16, height: 16,
                child: CircularProgressIndicator(color: Colors.amber, strokeWidth: 2),
              ),
            ),
          );
        }

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Bandeau nom du village ──────────────────────────
            _VillageSwitcherBar(villageName: s.villageName),
            // ── Ressources ──────────────────────────────────────
            Container(
              color: Colors.black87,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
              child: Row(
                children: [
                  _ResCol(icon: Icons.forest,   color: const Color(0xFF8D6E63), value: s.wood,  rate: s.woodRate,  max: s.maxStorage),
                  _ResCol(icon: Icons.terrain,  color: const Color(0xFF90A4AE), value: s.stone, rate: s.stoneRate, max: s.maxStorage),
                  _ResCol(icon: Icons.hardware, color: const Color(0xFF78909C), value: s.iron,  rate: s.ironRate,  max: s.maxStorage),
                  _PopCol(used: s.popUsed, max: s.popMax),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

// ── Barre nom village + bouton switcher ───────────────────────────
class _VillageSwitcherBar extends StatelessWidget {
  final String villageName;
  const _VillageSwitcherBar({required this.villageName});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _openSwitcher(context),
      child: Container(
        color: const Color(0xFF111111),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        child: Row(
          children: [
            const Icon(Icons.location_city, color: Colors.amber, size: 14),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                villageName.isEmpty ? '—' : villageName,
                style: const TextStyle(
                  color: Colors.amber,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(Icons.swap_horiz, color: Colors.white38, size: 14),
          ],
        ),
      ),
    );
  }

  Future<void> _openSwitcher(BuildContext context) async {
    final cubit = context.read<GlobalResourcesCubit>();
    final api   = getIt<VillageApi>();

    List<MyVillageItemDto> villages = [];
    try {
      villages = await api.getMyVillages();
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible de charger les villages')),
        );
      }
      return;
    }

    if (!context.mounted) return;

    final currentId = Hive.box('village').get('current_village_id') as String?;

    await showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _VillagePickerSheet(
        villages:  villages,
        currentId: currentId,
        onSelect:  (v) {
          Navigator.pop(context);
          cubit.switchVillage(v.id, v.name);
        },
      ),
    );
  }
}

// ── Bottom sheet liste des villages ──────────────────────────────
class _VillagePickerSheet extends StatelessWidget {
  final List<MyVillageItemDto> villages;
  final String?                currentId;
  final void Function(MyVillageItemDto) onSelect;

  const _VillagePickerSheet({
    required this.villages,
    required this.currentId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 12),
        Container(width: 40, height: 4, decoration: BoxDecoration(
          color: Colors.white24, borderRadius: BorderRadius.circular(2),
        )),
        const SizedBox(height: 12),
        const Text('Mes villages', style: TextStyle(
          color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16,
        )),
        const SizedBox(height: 8),
        const Divider(color: Colors.white12),
        ...villages.map((v) {
          final isCurrent = v.id == currentId;
          return ListTile(
            leading: Icon(
              Icons.location_city,
              color: isCurrent ? Colors.amber : Colors.white38,
            ),
            title: Text(
              v.name,
              style: TextStyle(
                color: isCurrent ? Colors.amber : Colors.white,
                fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            subtitle: Text(
              '(${v.x}, ${v.y})',
              style: const TextStyle(color: Colors.white38, fontSize: 11),
            ),
            trailing: isCurrent
                ? const Icon(Icons.check_circle, color: Colors.amber, size: 18)
                : null,
            onTap: () => onSelect(v),
          );
        }),
        const SizedBox(height: 16),
      ],
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
