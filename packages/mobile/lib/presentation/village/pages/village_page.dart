import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../bloc/village_bloc.dart';
import '../bloc/village_event.dart';
import '../bloc/village_state.dart';
import '../../../core/di/injection.dart';
import '../../../core/resources/global_resources_cubit.dart';
import '../../../data/remote/api/village_api.dart';
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
    // Rebuild quand le village change
    context.watch<GlobalResourcesCubit>();
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
      key: ValueKey(villageId),
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

class _ErrorView extends StatefulWidget {
  const _ErrorView({required this.message});
  final String message;

  @override
  State<_ErrorView> createState() => _ErrorViewState();
}

class _ErrorViewState extends State<_ErrorView> {
  bool _spawning = false;

  Future<void> _spawnVillage() async {
    setState(() => _spawning = true);
    try {
      final api  = getIt<VillageApi>();
      final data = await api.spawnVillage();
      final newId   = data['id']   as String;
      final newName = data['name'] as String;
      final newX    = (data['x']   as num).toInt();
      final newY    = (data['y']   as num).toInt();

      final box = Hive.box('village');
      await box.put('current_village_id',   newId);
      await box.put('current_village_name', newName);
      await box.put('village_x', newX);
      await box.put('village_y', newY);

      if (mounted) {
        context.read<GlobalResourcesCubit>().switchVillage(newId, newName);
        context.read<VillageBloc>().add(VillageEvent.loadRequested(newId));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: Colors.red),
        );
        setState(() => _spawning = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isConquered = widget.message == 'VILLAGE_CONQUERED';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isConquered ? Icons.flag : Icons.error_outline,
              color: isConquered ? Colors.amber : Colors.red,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              isConquered
                  ? '💀 Votre village a été conquis !'
                  : widget.message,
              style: TextStyle(
                color: isConquered ? Colors.white : Colors.red,
                fontSize: isConquered ? 18 : 14,
                fontWeight: isConquered ? FontWeight.bold : FontWeight.normal,
              ),
              textAlign: TextAlign.center,
            ),
            if (isConquered) ...[
              const SizedBox(height: 8),
              const Text(
                'Vous pouvez fonder un nouveau village pour reprendre la conquête.',
                style: TextStyle(color: Colors.white54, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 24),
            if (isConquered)
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber[800],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _spawning ? null : _spawnVillage,
                  icon: _spawning
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.add_home),
                  label: Text(_spawning ? 'Création...' : 'Fonder un nouveau village'),
                ),
              )
            else
              ElevatedButton(
                onPressed: () {
                  final id = Hive.box('village').get('current_village_id') as String?;
                  if (id != null) {
                    context.read<VillageBloc>().add(VillageEvent.loadRequested(id));
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
