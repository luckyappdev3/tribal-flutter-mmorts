import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/di/injection.dart';
import '../../../data/remote/api/api_client.dart';

class RankingEntry {
  final int    rank;
  final String playerId;
  final String username;
  final int    totalPoints;
  final String villageName;

  const RankingEntry({
    required this.rank,
    required this.playerId,
    required this.username,
    required this.totalPoints,
    required this.villageName,
  });

  factory RankingEntry.fromJson(Map<String, dynamic> json) => RankingEntry(
        rank:        json['rank']        as int,
        playerId:    json['playerId']    as String,
        username:    json['username']    as String,
        totalPoints: json['totalPoints'] as int,
        villageName: json['villageName'] as String? ?? '—',
      );
}

class RankingPage extends StatefulWidget {
  const RankingPage({super.key});

  @override
  State<RankingPage> createState() => _RankingPageState();
}

class _RankingPageState extends State<RankingPage> {
  List<RankingEntry> _entries   = [];
  bool               _loading   = true;
  String?            _error;
  String             _myId      = '';

  @override
  void initState() {
    super.initState();
    _myId = Hive.box('auth').get('player_id', defaultValue: '') as String;
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final client   = getIt<ApiClient>();
      final response = await client.dio.get('/ranking');
      final data     = response.data as List<dynamic>;
      setState(() {
        _entries = data
            .map((e) => RankingEntry.fromJson(e as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _loading = false; _error = '$e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: const Text('Classement', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.amber),
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Colors.amber))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _entries.isEmpty
                  ? const Center(child: Text('Aucun joueur classé', style: TextStyle(color: Colors.white54)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(14),
                      itemCount: _entries.length,
                      itemBuilder: (context, index) {
                        final entry = _entries[index];
                        final isMe  = entry.playerId == _myId;
                        return _RankingTile(entry: entry, isMe: isMe);
                      },
                    ),
    );
  }
}

class _RankingTile extends StatelessWidget {
  final RankingEntry entry;
  final bool         isMe;

  const _RankingTile({required this.entry, required this.isMe});

  Color get _rankColor {
    if (entry.rank == 1) return const Color(0xFFFFD700); // Or
    if (entry.rank == 2) return const Color(0xFFC0C0C0); // Argent
    if (entry.rank == 3) return const Color(0xFFCD7F32); // Bronze
    return Colors.white54;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isMe ? const Color(0xFF2A2200) : const Color(0xFF222222),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isMe ? Colors.amber.withOpacity(0.6) : Colors.white.withOpacity(0.08),
          width: isMe ? 1.5 : 0.5,
        ),
      ),
      child: Row(
        children: [
          // ── Rang ──
          SizedBox(
            width: 36,
            child: Text(
              '#${entry.rank}',
              style: TextStyle(
                color:      _rankColor,
                fontWeight: FontWeight.bold,
                fontSize:   entry.rank <= 3 ? 16 : 13,
              ),
            ),
          ),

          // ── Médaille top 3 ──
          if (entry.rank <= 3) ...[
            Text(
              entry.rank == 1 ? '🥇' : entry.rank == 2 ? '🥈' : '🥉',
              style: const TextStyle(fontSize: 18),
            ),
            const SizedBox(width: 8),
          ] else
            const SizedBox(width: 26),

          // ── Nom + village ──
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      entry.username,
                      style: TextStyle(
                        color:      isMe ? Colors.amber : Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize:   14,
                      ),
                    ),
                    if (isMe) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: Colors.amber.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('Moi', style: TextStyle(color: Colors.amber, fontSize: 10)),
                      ),
                    ],
                  ],
                ),
                Text(
                  entry.villageName,
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),

          // ── Points ──
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${entry.totalPoints}',
                style: TextStyle(
                  color:      _rankColor,
                  fontWeight: FontWeight.bold,
                  fontSize:   15,
                  fontFamily: 'monospace',
                ),
              ),
              const Text('pts', style: TextStyle(color: Colors.white38, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }
}
