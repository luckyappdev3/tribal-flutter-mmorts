import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/resources/global_resources_cubit.dart';
import '../bloc/map_bloc.dart';
import '../bloc/map_event.dart';
import '../bloc/map_state.dart';
import '../widgets/village_info_sheet.dart';

class MapPage extends StatelessWidget {
  const MapPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Rebuild quand le village change → recentre sur le nouveau village
    context.watch<GlobalResourcesCubit>();
    final villageBox = Hive.box('village');
    final int startX = villageBox.get('village_x', defaultValue: 20) as int;
    final int startY = villageBox.get('village_y', defaultValue: 20) as int;

    return BlocProvider(
      key: ValueKey('$startX,$startY'),
      create: (_) => MapBloc()..add(MapEvent.loadRequested(x: startX, y: startY)),
      child: const _MapView(),
    );
  }
}

class _MapView extends StatelessWidget {
  const _MapView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B0D),
      body: Column(
        children: [
          // ── Légende + bouton centrer ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            color: Colors.black54,
            child: Row(
              children: [
                _LegendItem(color: Colors.amber,         icon: Icons.shield,          label: 'Actif'),
                const SizedBox(width: 10),
                _LegendItem(color: Colors.green[400]!,   icon: Icons.shield,          label: 'Mes villages'),
                const SizedBox(width: 10),
                _LegendItem(color: Colors.red[300]!,     icon: Icons.fort,            label: 'Ennemi'),
                const SizedBox(width: 10),
                _LegendItem(color: Colors.grey[400]!,    icon: Icons.holiday_village, label: 'Abandonné'),
                const Spacer(),
                GestureDetector(
                  onTap: () {
                    final vb = Hive.box('village');
                    final x  = vb.get('village_x', defaultValue: 20) as int;
                    final y  = vb.get('village_y', defaultValue: 20) as int;
                    context.read<MapBloc>().add(MapEvent.loadRequested(x: x, y: y));
                  },
                  child: const Row(
                    children: [
                      Icon(Icons.my_location, color: Colors.amber, size: 16),
                      SizedBox(width: 4),
                      Text('Mon village', style: TextStyle(color: Colors.amber, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: BlocBuilder<MapBloc, MapState>(
              builder: (context, state) {
                return state.when(
                  initial: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
                  loading: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
                  error:   (msg) => Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 48),
                        const SizedBox(height: 12),
                        Text(msg, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            final vb = Hive.box('village');
                            context.read<MapBloc>().add(MapEvent.loadRequested(
                              x: vb.get('village_x', defaultValue: 20) as int,
                              y: vb.get('village_y', defaultValue: 20) as int,
                            ));
                          },
                          child: const Text('Réessayer'),
                        ),
                      ],
                    ),
                  ),
                  loaded: (villages, centerX, centerY) => _MapGrid(
                    villages: villages,
                    centerX:  centerX,
                    centerY:  centerY,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color    color;
  final IconData icon;
  final String   label;
  const _LegendItem({required this.color, required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: color, size: 14),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: color, fontSize: 11)),
      ],
    );
  }
}

class _MapGrid extends StatefulWidget {
  final List<VillageMarker> villages;
  final int centerX;
  final int centerY;

  const _MapGrid({required this.villages, required this.centerX, required this.centerY});

  @override
  State<_MapGrid> createState() => _MapGridState();
}

class _MapGridState extends State<_MapGrid> {
  final TransformationController _controller = TransformationController();
  static const int _radius = 20;
  static const double _cellSize = 50.0;

  String get _currentPlayerId =>
      Hive.box('auth').get('player_id', defaultValue: '') as String;

  String get _currentVillageId =>
      Hive.box('village').get('current_village_id', defaultValue: '') as String;

  Map<String, VillageMarker> get _villageMap =>
      {for (final v in widget.villages) '${v.x},${v.y}': v};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _centerView());
  }

  void _centerView() {
    if (!mounted) return;
    final screenSize = MediaQuery.of(context).size;
    final gridSize   = _radius * 2 + 1;
    final gridPixels = gridSize * _cellSize;
    final dx = (gridPixels / 2) - (screenSize.width  / 2);
    final dy = (gridPixels / 2) - (screenSize.height / 2);
    _controller.value = Matrix4.identity()..translate(-dx, -dy);
  }

  @override
  void didUpdateWidget(_MapGrid oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.centerX != widget.centerX || oldWidget.centerY != widget.centerY) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _centerView());
    }
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    // Rebuild quand le village actif change → met à jour les couleurs de cellules
    context.watch<GlobalResourcesCubit>();

    final gridSize         = _radius * 2 + 1;
    final villageMap       = _villageMap;
    final currentPlayerId  = _currentPlayerId;
    final currentVillageId = _currentVillageId;

    return InteractiveViewer(
      transformationController: _controller,
      constrained: false,
      minScale: 0.3,
      maxScale: 3.0,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(gridSize, (row) {
            final y = widget.centerY + _radius - row;
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(gridSize, (col) {
                final x       = widget.centerX - _radius + col;
                final village = villageMap['$x,$y'];
                return _MapCell(
                  x: x, y: y,
                  village: village,
                  currentPlayerId:  currentPlayerId,
                  currentVillageId: currentVillageId,
                  onTap: village == null
                      ? null
                      : () => VillageInfoSheet.show(context, village, currentPlayerId),
                );
              }),
            );
          }),
        ),
      ),
    );
  }
}

class _MapCell extends StatelessWidget {
  final int            x, y;
  final VillageMarker? village;
  final String         currentPlayerId;
  final String         currentVillageId;
  final VoidCallback?  onTap;

  const _MapCell({
    required this.x, required this.y,
    required this.village,
    required this.currentPlayerId,
    required this.currentVillageId,
    this.onTap,
  });

  bool get _isOwn       => village != null && village!.playerId == currentPlayerId;
  bool get _isSelected  => village != null && village!.id == currentVillageId;
  bool get _isAbandoned => village?.isAbandoned == true;

  @override
  Widget build(BuildContext context) {
    final hasVillage = village != null;

    Color cellColor;
    if (!hasVillage) {
      cellColor = (x + y) % 2 == 0 ? const Color(0xFF0D1B0D) : const Color(0xFF0F1F0F);
    } else if (_isAbandoned) {
      cellColor = const Color(0xFF1A1A1A);
    } else if (_isSelected) {
      cellColor = const Color(0xFF2A2200); // amber foncé — village actif
    } else if (_isOwn) {
      cellColor = const Color(0xFF0A2200); // vert foncé — autre village à moi
    } else {
      cellColor = const Color(0xFF2A0000);
    }

    Color borderColor = Colors.white.withOpacity(0.04);
    List<BoxShadow>? shadows;
    if (hasVillage) {
      if (_isAbandoned) {
        borderColor = Colors.grey.withOpacity(0.4);
      } else if (_isSelected) {
        borderColor = Colors.amber.withOpacity(0.9);
        shadows = [BoxShadow(color: Colors.amber.withOpacity(0.4), blurRadius: 10, spreadRadius: 1)];
      } else if (_isOwn) {
        borderColor = Colors.green.withOpacity(0.7);
        shadows = [BoxShadow(color: Colors.green.withOpacity(0.3), blurRadius: 8, spreadRadius: 1)];
      } else {
        borderColor = Colors.red.withOpacity(0.5);
      }
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48, height: 48,
        margin: const EdgeInsets.all(1),
        decoration: BoxDecoration(
          color: cellColor,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: borderColor, width: hasVillage ? 1.5 : 0.5),
          boxShadow: shadows,
        ),
        child: hasVillage
            ? _VillageCell(village: village!, isOwn: _isOwn, isSelected: _isSelected)
            : Center(child: Text('($x,$y)', style: const TextStyle(color: Colors.white12, fontSize: 7))),
      ),
    );
  }
}

class _VillageCell extends StatelessWidget {
  final VillageMarker village;
  final bool          isOwn;
  final bool          isSelected;

  const _VillageCell({required this.village, required this.isOwn, required this.isSelected});

  bool get _isAbandoned => village.isAbandoned;

  @override
  Widget build(BuildContext context) {
    if (_isAbandoned) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.holiday_village, size: 18, color: Colors.grey[400]),
          const SizedBox(height: 1),
          Text(
            'Niv.${village.abandonedLevel}',
            style: TextStyle(color: Colors.grey[500], fontSize: 7, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
        ],
      );
    }

    final Color iconColor  = isSelected ? Colors.amber : isOwn ? Colors.green[400]! : Colors.red[300]!;
    final Color labelColor = isSelected ? Colors.amber : isOwn ? Colors.green[300]! : Colors.red[200]!;
    final Color gradStart  = isSelected ? Colors.amber.withOpacity(0.2) : Colors.green.withOpacity(0.15);
    final Color gradEnd    = isSelected ? Colors.amber.withOpacity(0.05) : Colors.green.withOpacity(0.03);

    return Stack(
      children: [
        if (isOwn)
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(3),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end:   Alignment.bottomRight,
                colors: [gradStart, gradEnd],
              ),
            ),
          ),
        Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  isOwn ? Icons.shield : Icons.fort,
                  size:  isOwn ? 22 : 18,
                  color: iconColor,
                ),
                if (village.isRecentlyConquered)
                  const Positioned(
                    top: -6, right: -6,
                    child: Text('👑', style: TextStyle(fontSize: 10)),
                  ),
              ],
            ),
            const SizedBox(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Text(
                isSelected ? 'Actif' : isOwn ? 'Moi' : village.playerName,
                style: TextStyle(
                  color: labelColor,
                  fontSize: isOwn ? 8 : 7,
                  fontWeight: FontWeight.bold,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
