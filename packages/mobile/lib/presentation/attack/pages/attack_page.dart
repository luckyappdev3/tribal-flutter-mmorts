import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/troops_api.dart';
import 'package:mobile_client/presentation/troops/dto/troops_dto.dart';

class AttackPage extends StatefulWidget {
  final String defenderVillageId;
  final String defenderName;
  final String defenderPlayerName;

  const AttackPage({
    super.key,
    required this.defenderVillageId,
    required this.defenderName,
    required this.defenderPlayerName,
  });

  @override
  State<AttackPage> createState() => _AttackPageState();
}

class _AttackPageState extends State<AttackPage> {
  final TroopsApi _troopsApi = getIt<TroopsApi>();

  List<TroopDto>       _troops       = [];
  Map<String, int>     _selected     = {}; // unitType → count à envoyer
  bool                 _loading      = true;
  bool                 _sending      = false;
  String?              _error;

  @override
  void initState() {
    super.initState();
    _loadTroops();
  }

  Future<void> _loadTroops() async {
    final villageId = Hive.box('village').get('current_village_id') as String?;
    if (villageId == null) return;
    try {
      final dto = await _troopsApi.getTroops(villageId);
      setState(() {
        _troops  = dto.troops.where((t) => t.count > 0).toList();
        _loading = false;
        _selected = { for (final t in _troops) t.unitType: 0 };
      });
    } catch (e) {
      setState(() { _loading = false; _error = '$e'; });
    }
  }

  int get _totalSelected => _selected.values.fold(0, (s, c) => s + c);

  Future<void> _sendAttack() async {
    if (_totalSelected == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sélectionnez au moins 1 unité'), backgroundColor: Colors.red),
      );
      return;
    }

    final villageId = Hive.box('village').get('current_village_id') as String?;
    if (villageId == null) return;

    setState(() => _sending = true);

    // Ne garder que les unités avec count > 0
    final units = Map.fromEntries(
      _selected.entries.where((e) => e.value > 0),
    );

    try {
      final result = await _troopsApi.sendAttack(
        villageId, widget.defenderVillageId, units,
      );
      if (mounted) {
        final secs = result['travelSec'] as int? ?? 0;
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('⚔️ Attaque lancée ! Arrivée dans $secs secondes.'),
            backgroundColor: Colors.red[800],
          ),
        );
      }
    } catch (e) {
      setState(() => _sending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur : $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: const Text('Envoyer une attaque', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Colors.amber))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : Column(
                  children: [
                    // ── Cible ──
                    Container(
                      padding: const EdgeInsets.all(16),
                      color: Colors.black54,
                      child: Row(
                        children: [
                          const Icon(Icons.fort, color: Colors.red, size: 28),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(widget.defenderName,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                              Text('de ${widget.defenderPlayerName}',
                                  style: const TextStyle(color: Colors.white54, fontSize: 12)),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // ── Sélection des unités ──
                    Expanded(
                      child: _troops.isEmpty
                          ? const Center(
                              child: Text(
                                'Aucune troupe disponible.\nRecrutez des unités d\'abord.',
                                style: TextStyle(color: Colors.white54),
                                textAlign: TextAlign.center,
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _troops.length,
                              itemBuilder: (context, index) {
                                final troop = _troops[index];
                                final sending = _selected[troop.unitType] ?? 0;
                                return _UnitSelector(
                                  troop:    troop,
                                  sending:  sending,
                                  onChanged: (val) => setState(
                                    () => _selected[troop.unitType] = val,
                                  ),
                                );
                              },
                            ),
                    ),

                    // ── Bouton attaquer ──
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _totalSelected > 0 ? Colors.red[800] : Colors.grey[800],
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _sending ? null : _sendAttack,
                          icon: _sending
                              ? const SizedBox(width: 18, height: 18,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(Icons.bolt),
                          label: Text(
                            _totalSelected > 0
                                ? 'ATTAQUER avec $_totalSelected unités'
                                : 'Sélectionnez des unités',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _UnitSelector extends StatelessWidget {
  final TroopDto troop;
  final int      sending;
  final void Function(int) onChanged;

  const _UnitSelector({
    required this.troop,
    required this.sending,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF222222),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: sending > 0 ? Colors.red.withOpacity(0.5) : Colors.white.withOpacity(0.08),
        ),
      ),
      child: Row(
        children: [
          Text(troop.icon, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(troop.name,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                Text('Disponibles : ${troop.count}',
                    style: const TextStyle(color: Colors.white38, fontSize: 11)),
              ],
            ),
          ),
          // Sélecteur quantité
          IconButton(
            onPressed: sending > 0 ? () => onChanged(sending - 1) : null,
            icon: const Icon(Icons.remove_circle, color: Colors.red),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
          SizedBox(
            width: 36,
            child: Text(
              '$sending',
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
          ),
          IconButton(
            onPressed: sending < troop.count ? () => onChanged(sending + 1) : null,
            icon: const Icon(Icons.add_circle, color: Colors.green),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
          // Bouton "Tout envoyer"
          TextButton(
            onPressed: () => onChanged(troop.count),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: const Size(40, 32),
            ),
            child: const Text('Max', style: TextStyle(color: Colors.amber, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}
