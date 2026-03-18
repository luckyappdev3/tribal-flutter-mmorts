import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../bloc/movements_bloc.dart';
import '../bloc/movements_event.dart';
import '../bloc/movements_state.dart';
import '../widgets/movement_tile.dart';

class MovementsPage extends StatelessWidget {
  const MovementsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final String? villageId = Hive.box('village').get('current_village_id');
    if (villageId == null) {
      return const Scaffold(
        body: Center(child: Text('Village introuvable', style: TextStyle(color: Colors.white))),
      );
    }

    return BlocProvider(
      create: (_) => MovementsBloc()..add(MovementsEvent.loadRequested(villageId)),
      child: const _MovementsView(),
    );
  }
}

class _MovementsView extends StatelessWidget {
  const _MovementsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: const Text('Mouvements', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.amber),
            onPressed: () => context
                .read<MovementsBloc>()
                .add(const MovementsEvent.refreshRequested()),
          ),
        ],
      ),
      body: BlocConsumer<MovementsBloc, MovementsState>(
        listener: (context, state) {
          state.maybeWhen(
            loaded: (villageId, movements, incomingAlert, hasNewReport) {
              // Popup attaque entrante
              if (incomingAlert != null) {
                _showIncomingAlert(context, incomingAlert);
              }
            },
            orElse: () {},
          );
        },
        builder: (context, state) {
          return state.when(
            initial: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            error:   (msg) => Center(child: Text(msg, style: const TextStyle(color: Colors.red))),
            loaded:  (villageId, movements, _, __) => _LoadedBody(movements: movements),
          );
        },
      ),
    );
  }

  void _showIncomingAlert(BuildContext context, Map<String, dynamic> data) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF2A0000),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.red.withOpacity(0.6)),
        ),
        title: const Row(
          children: [
            Icon(Icons.warning_amber, color: Colors.red, size: 28),
            SizedBox(width: 8),
            Text('⚔️ Attaque !', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              data['attackerWon'] == false
                  ? 'Votre village a repoussé une attaque !'
                  : 'Votre village a été attaqué !',
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 12),
            if ((data['resourcesLooted'] as Map?)?.isNotEmpty == true)
              Text(
                'Ressources pillées : '
                '🪵${(data['resourcesLooted']?['wood'] ?? 0)} '
                '🪨${(data['resourcesLooted']?['stone'] ?? 0)} '
                '⚙️${(data['resourcesLooted']?['iron'] ?? 0)}',
                style: const TextStyle(color: Colors.amber, fontSize: 13),
              ),
            const SizedBox(height: 4),
            Text(
              'Points perdus : ${data['pointsLost'] ?? 0}',
              style: const TextStyle(color: Colors.red, fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fermer', style: TextStyle(color: Colors.white54)),
          ),
        ],
      ),
    );
  }
}

class _LoadedBody extends StatelessWidget {
  final dynamic movements;
  const _LoadedBody({required this.movements});

  @override
  Widget build(BuildContext context) {
    final list = movements as List;

    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.directions_run, size: 64, color: Colors.white24),
            const SizedBox(height: 16),
            const Text('Aucun mouvement en cours',
                style: TextStyle(color: Colors.white54, fontSize: 16)),
            const SizedBox(height: 8),
            const Text('Lancez une attaque depuis la carte',
                style: TextStyle(color: Colors.white24, fontSize: 13)),
          ],
        ),
      );
    }

    // Séparer sortants et entrants
    final outgoing = list.where((m) => m.isOutgoing).toList();
    final incoming = list.where((m) => !m.isOutgoing).toList();

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        if (outgoing.isNotEmpty) ...[
          _SectionHeader(
            icon: Icons.arrow_upward,
            label: 'Mes attaques (${outgoing.length})',
            color: Colors.red[300]!,
          ),
          ...outgoing.map((m) => MovementTile(movement: m)),
          const SizedBox(height: 8),
        ],
        if (incoming.isNotEmpty) ...[
          _SectionHeader(
            icon: Icons.warning_amber,
            label: 'Attaques entrantes (${incoming.length})',
            color: Colors.orange,
          ),
          ...incoming.map((m) => MovementTile(movement: m)),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String   label;
  final Color    color;

  const _SectionHeader({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}
