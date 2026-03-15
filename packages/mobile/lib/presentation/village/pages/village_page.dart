import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../bloc/village_bloc.dart';
import '../bloc/village_event.dart';
import '../bloc/village_state.dart';

class VillagePage extends StatelessWidget {
  const VillagePage({super.key});

  @override
  Widget build(BuildContext context) {
    // 1. Récupération de l'ID stocké dans Hive lors du Login
    final villageBox = Hive.box('village');
    final String? villageId = villageBox.get('current_village_id');

    // 2. Si l'ID est introuvable, on affiche un écran d'erreur
    if (villageId == null || villageId.isEmpty) {
      return const Scaffold(
        body: Center(
          child: Text(
            "Erreur : Aucun village associé à ce compte.",
            style: TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    // 3. Fourniture du Bloc avec l'ID dynamique
    return BlocProvider(
      create: (context) => VillageBloc()..add(VillageEvent.loadRequested(villageId)),
      child: const VillageView(),
    );
  }
}

class VillageView extends StatelessWidget {
  const VillageView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: const Text("Mon Royaume"),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
      ),
      body: BlocBuilder<VillageBloc, VillageState>(
        builder: (context, state) {
          return state.when(
            initial: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            loading: () => const Center(child: CircularProgressIndicator(color: Colors.amber)),
            error: (message) => Center(
              child: Text("Erreur: $message", style: const TextStyle(color: Colors.red)),
            ),
            loaded: (id, name, wood, stone, iron) => Column(
              children: [
                // BARRE DES RESSOURCES
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
                  decoration: const BoxDecoration(
                    color: Colors.black87,
                    borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                    boxShadow: [
                      BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 5))
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _resourceItem(Icons.forest, "Bois", wood.toString(), Colors.brown),
                      _resourceItem(Icons.terrain, "Pierre", stone.toString(), Colors.grey),
                      _resourceItem(Icons.iron, "Fer", iron.toString(), Colors.blueGrey),
                    ],
                  ),
                ),
                
                const Spacer(),
                
                // VISUEL DU VILLAGE
                const Icon(Icons.fort, size: 150, color: Colors.amber),
                const SizedBox(height: 10),
                Text(
                  name, 
                  style: const TextStyle(
                    fontSize: 26, 
                    fontWeight: FontWeight.bold, 
                    color: Colors.white,
                    letterSpacing: 1.2
                  )
                ),
                const Text("Souverain Yildirim", style: TextStyle(color: Colors.amber, fontSize: 14)),
                
                // DEBUG INFO (Optionnel, à retirer pour la prod)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text("ID: $id", style: TextStyle(color: Colors.white24, fontSize: 10)),
                ),
                
                const Spacer(),
                
                // BOUTON DE CONSTRUCTION
                Padding(
                  padding: const EdgeInsets.all(25.0),
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.amber[900],
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 60),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 8,
                    ),
                    onPressed: () => _showConstructionMenu(context),
                    icon: const Icon(Icons.account_balance, size: 28),
                    label: const Text(
                      "CONSTRUIRE L'EMPIRE", 
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _resourceItem(IconData icon, String name, String value, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 5),
        Text(
          value, 
          style: const TextStyle(
            color: Colors.white, 
            fontSize: 18, 
            fontWeight: FontWeight.bold,
            fontFamily: 'Monospace'
          )
        ),
        Text(
          name.toUpperCase(), 
          style: TextStyle(color: color.withOpacity(0.9), fontSize: 10, fontWeight: FontWeight.w600)
        ),
      ],
    );
  }

  void _showConstructionMenu(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Menu de construction bientôt disponible..."))
    );
  }
}