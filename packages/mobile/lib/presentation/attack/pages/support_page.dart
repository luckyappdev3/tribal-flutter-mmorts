import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/di/injection.dart';
import '../../../core/utils/app_snack_bar.dart';
import '../../../data/remote/api/troops_api.dart';
import 'package:mobile_client/presentation/troops/dto/troops_dto.dart';

class SupportPage extends StatefulWidget {
  final String targetVillageId;
  final String targetVillageName;

  const SupportPage({
    super.key,
    required this.targetVillageId,
    required this.targetVillageName,
  });

  @override
  State<SupportPage> createState() => _SupportPageState();
}

class _SupportPageState extends State<SupportPage> {
  final TroopsApi _troopsApi = getIt<TroopsApi>();

  List<TroopDto>   _troops  = [];
  Map<String, int> _selected = {};
  bool             _loading  = true;
  bool             _sending  = false;
  String?          _error;

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
        _troops   = dto.troops.where((t) => t.count > 0).toList();
        _loading  = false;
        _selected = {for (final t in _troops) t.unitType: 0};
      });
    } catch (e) {
      setState(() { _loading = false; _error = '$e'; });
    }
  }

  int get _totalSelected => _selected.values.fold(0, (s, c) => s + c);

  Future<void> _sendSupport() async {
    if (_totalSelected == 0) {
      AppSnackBar.info(context, 'Sélectionnez au moins 1 unité.');
      return;
    }
    final villageId = Hive.box('village').get('current_village_id') as String?;
    if (villageId == null) return;

    setState(() => _sending = true);
    final units = Map.fromEntries(_selected.entries.where((e) => e.value > 0));

    try {
      final result = await _troopsApi.sendSupport(
          villageId, widget.targetVillageId, units);
      if (mounted) {
        final secs = result['travelSec'] as int? ?? 0;
        Navigator.pop(context);
        AppSnackBar.success(
            context, 'Renforts envoyés ! Arrivée dans $secs secondes.');
      }
    } catch (e) {
      setState(() => _sending = false);
      if (mounted) AppSnackBar.error(context, '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: const Text('Envoyer des renforts',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Colors.amber))
          : _error != null
              ? Center(
                  child: Text(_error!,
                      style: const TextStyle(color: Colors.red)))
              : Column(
                  children: [
                    // ── Cible ──
                    Container(
                      padding: const EdgeInsets.all(16),
                      color: Colors.black54,
                      child: Row(
                        children: [
                          const Icon(Icons.shield, color: Colors.green, size: 28),
                          const SizedBox(width: 12),
                          Text(widget.targetVillageName,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16)),
                        ],
                      ),
                    ),

                    // ── Sélection des unités ──
                    Expanded(
                      child: _troops.isEmpty
                          ? const Center(
                              child: Text(
                                'Aucune troupe disponible.',
                                style: TextStyle(color: Colors.white54),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _troops.length,
                              itemBuilder: (context, index) {
                                final troop   = _troops[index];
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

                    // ── Bouton envoyer ──
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _totalSelected > 0
                                ? Colors.green[800]
                                : Colors.grey[800],
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _sending ? null : _sendSupport,
                          icon: _sending
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      color: Colors.white, strokeWidth: 2))
                              : const Icon(Icons.shield),
                          label: Text(
                            _totalSelected > 0
                                ? 'RENFORCER avec $_totalSelected unités'
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
          color: sending > 0
              ? Colors.green.withOpacity(0.5)
              : Colors.white.withOpacity(0.08),
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
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold)),
                Text('Disponibles : ${troop.count}',
                    style:
                        const TextStyle(color: Colors.white38, fontSize: 11)),
              ],
            ),
          ),
          IconButton(
            onPressed:
                sending > 0 ? () => onChanged(sending - 1) : null,
            icon: const Icon(Icons.remove_circle, color: Colors.red),
            padding: EdgeInsets.zero,
            constraints:
                const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
          SizedBox(
            width: 36,
            child: Text(
              '$sending',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
          ),
          IconButton(
            onPressed: sending < troop.count
                ? () => onChanged(sending + 1)
                : null,
            icon: const Icon(Icons.add_circle, color: Colors.green),
            padding: EdgeInsets.zero,
            constraints:
                const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
          TextButton(
            onPressed: () => onChanged(troop.count),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: const Size(40, 32),
            ),
            child: const Text('Max',
                style: TextStyle(color: Colors.amber, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}
