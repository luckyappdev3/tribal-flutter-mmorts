import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../bloc/village_bloc.dart';
import '../bloc/village_event.dart';
import '../bloc/village_state.dart';
import '../../../core/router/route_names.dart';

// ─────────────────────────────────────────────────────────────
//  VillagePage — Phase 1 patch
//
//  Compatible avec le VillageState existant (id, name, wood,
//  stone, iron, woodRate, stoneRate, ironRate, maxStorage).
//  Le VillageBloc gère déjà l'interpolation locale via localTick.
//  La barre de navigation existe déjà dans app_router.dart.
//
//  Changements vs l'original :
//   • Grille de 4 boutons d'action rapides
//   • Barre de progression du stockage sur chaque ressource
//   • Affichage propre en mode chargement/erreur
// ─────────────────────────────────────────────────────────────

class VillagePage extends StatelessWidget {
  const VillagePage({super.key});

  @override
  Widget build(BuildContext context) {
    final villageBox = Hive.box('village');
    final String? villageId = villageBox.get('current_village_id');

    if (villageId == null || villageId.isEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFF1A1A1A),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              const Text(
                'Aucun village associé à ce compte.',
                style: TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Se reconnecter', style: TextStyle(color: Colors.amber)),
              ),
            ],
          ),
        ),
      );
    }

    return BlocProvider(
      create: (_) => VillageBloc()..add(VillageEvent.loadRequested(villageId)),
      child: const _VillageView(),
    );
  }
}

class _VillageView extends StatelessWidget {
  const _VillageView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: BlocBuilder<VillageBloc, VillageState>(
          builder: (_, state) => Text(
            state.maybeWhen(
              loaded: (id, name, wood, stone, iron,
                  woodRate, stoneRate, ironRate, maxStorage) => name,
              orElse: () => 'Mon Royaume',
            ),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.amber),
            onPressed: () {
              final villageId =
                  Hive.box('village').get('current_village_id') as String?;
              if (villageId != null) {
                context
                    .read<VillageBloc>()
                    .add(VillageEvent.loadRequested(villageId));
              }
            },
          ),
        ],
      ),
      body: BlocBuilder<VillageBloc, VillageState>(
        builder: (context, state) => state.when(
          initial: () =>
              const Center(child: CircularProgressIndicator(color: Colors.amber)),
          loading: () =>
              const Center(child: CircularProgressIndicator(color: Colors.amber)),
          error: (msg) => _ErrorView(message: msg),
          loaded: (id, name, wood, stone, iron,
                  woodRate, stoneRate, ironRate, maxStorage) =>
              _LoadedBody(
            id: id,
            name: name,
            wood: wood,
            stone: stone,
            iron: iron,
            woodRate: woodRate,
            stoneRate: stoneRate,
            ironRate: ironRate,
            maxStorage: maxStorage,
          ),
        ),
      ),
    );
  }
}

class _LoadedBody extends StatelessWidget {
  const _LoadedBody({
    required this.id,
    required this.name,
    required this.wood,
    required this.stone,
    required this.iron,
    required this.woodRate,
    required this.stoneRate,
    required this.ironRate,
    required this.maxStorage,
  });

  final String id, name;
  final double wood, stone, iron;
  final double woodRate, stoneRate, ironRate;
  final double maxStorage;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── BARRE DES RESSOURCES ────────────────────────────────
        // Le VillageBloc émet localTick() toutes les secondes —
        // les valeurs s'actualisent automatiquement via BlocBuilder.
        Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: const BoxDecoration(
            color: Colors.black87,
            borderRadius:
                BorderRadius.vertical(bottom: Radius.circular(20)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black45,
                  blurRadius: 8,
                  offset: Offset(0, 4))
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _ResourceItem(
                icon: Icons.forest,
                label: 'Bois',
                value: wood,
                rate: woodRate,
                max: maxStorage,
                color: const Color(0xFF8D6E63),
              ),
              _ResourceItem(
                icon: Icons.terrain,
                label: 'Pierre',
                value: stone,
                rate: stoneRate,
                max: maxStorage,
                color: const Color(0xFF90A4AE),
              ),
              _ResourceItem(
                icon: Icons.hardware,
                label: 'Fer',
                value: iron,
                rate: ironRate,
                max: maxStorage,
                color: const Color(0xFF78909C),
              ),
            ],
          ),
        ),

        const Spacer(),

        // ── VISUEL VILLAGE ──────────────────────────────────────
        const Icon(Icons.fort, size: 110, color: Colors.amber),
        const SizedBox(height: 8),
        Text(
          name,
          style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: 1.2),
        ),
        const SizedBox(height: 4),
        Text('ID: $id',
            style:
                const TextStyle(color: Colors.white24, fontSize: 10)),

        const Spacer(),

        // ── GRILLE D'ACTIONS ────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _ActionButton(
                      icon: Icons.account_balance,
                      label: 'CONSTRUIRE',
                      color: Colors.amber[900]!,
                      onTap: () =>
                          context.goNamed(RouteNames.construction),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _ActionButton(
                      icon: Icons.shield,
                      label: 'TROUPES',
                      color: const Color(0xFF1E3A1E),
                      onTap: () =>
                          context.goNamed(RouteNames.troops),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _ActionButton(
                      icon: Icons.map,
                      label: 'CARTE',
                      color: const Color(0xFF1A2540),
                      onTap: () => context.goNamed(RouteNames.map),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _ActionButton(
                      icon: Icons.directions_run,
                      label: 'MOUVEMENTS',
                      color: const Color(0xFF2A1A40),
                      onTap: () =>
                          context.goNamed(RouteNames.movements),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Ressource individuelle ──────────────────────────────────────

class _ResourceItem extends StatelessWidget {
  const _ResourceItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.rate,
    required this.max,
    required this.color,
  });

  final IconData icon;
  final String label;
  final double value, rate, max;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final pct = max > 0 ? (value / max).clamp(0.0, 1.0) : 0.0;
    final atCap = value >= max;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 2),
        Text(
          _format(value.floor()),
          style: TextStyle(
            color: atCap ? Colors.red[300] : Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.bold,
            fontFamily: 'monospace',
          ),
        ),
        Text(
          label.toUpperCase(),
          style: TextStyle(
              color: color,
              fontSize: 9,
              fontWeight: FontWeight.w600,
              letterSpacing: 1),
        ),
        const SizedBox(height: 2),
        Text(
          '+${rate.toStringAsFixed(2)}/s',
          style: const TextStyle(color: Colors.white38, fontSize: 9),
        ),
        const SizedBox(height: 4),
        SizedBox(
          width: 56,
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: Colors.white12,
            color: atCap ? Colors.red[400] : color,
            minHeight: 3,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ],
    );
  }

  String _format(int v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 10000)   return '${(v / 1000).toStringAsFixed(1)}k';
    return v.toString();
  }
}

// ── Bouton d'action ─────────────────────────────────────────────

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10)),
        elevation: 4,
      ),
      onPressed: onTap,
      icon: Icon(icon, size: 20),
      label: Text(
        label,
        style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5),
      ),
    );
  }
}

// ── Écran d'erreur ──────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 16),
            Text(message,
                style: const TextStyle(color: Colors.red),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                final id = Hive.box('village')
                    .get('current_village_id') as String?;
                if (id != null) {
                  context
                      .read<VillageBloc>()
                      .add(VillageEvent.loadRequested(id));
                }
              },
              child: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}
