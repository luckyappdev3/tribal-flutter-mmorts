import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hive/hive.dart';

class GameOverPage extends StatelessWidget {
  final bool   isVictory;
  final String winnerId;
  final String winnerName;
  final int    duration; // en secondes

  const GameOverPage({
    super.key,
    required this.isVictory,
    required this.winnerId,
    required this.winnerName,
    required this.duration,
  });

  String get _durationText {
    final mins = duration ~/ 60;
    final secs = duration % 60;
    return '${mins}m ${secs}s';
  }

  @override
  Widget build(BuildContext context) {
    final currentPlayerId = Hive.box('auth').get('player_id') as String?;
    final won = winnerId == currentPlayerId;

    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icône victoire/défaite
              Icon(
                won ? Icons.emoji_events : Icons.sentiment_very_dissatisfied,
                size: 80,
                color: won ? Colors.amber[600] : Colors.red[400],
              ),
              const SizedBox(height: 24),

              // Titre
              Text(
                won ? '🏆 VICTOIRE' : '💀 DÉFAITE',
                style: TextStyle(
                  color:      Colors.white,
                  fontSize:   32,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),

              // Message
              Text(
                won
                    ? 'Vous avez conquis tous les villages !'
                    : 'Votre village a été conquis par $winnerName',
                style: const TextStyle(color: Colors.white70, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Stats
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF262626),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Durée',
                          style: TextStyle(color: Colors.white54),
                        ),
                        Text(
                          _durationText,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Gagnant',
                          style: TextStyle(color: Colors.white54),
                        ),
                        Text(
                          winnerName,
                          style: const TextStyle(
                            color: Colors.amber,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 40),

              // Boutons
              Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber[800],
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () => context.go('/lobby'),
                      child: const Text(
                        'REJOUER',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.white24),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () => context.go('/'),
                      child: const Text(
                        'RETOUR LOBBY',
                        style: TextStyle(color: Colors.white70, fontSize: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
