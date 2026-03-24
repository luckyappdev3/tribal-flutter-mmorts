import 'package:flutter/material.dart';

/// Utilitaire centralisé pour tous les SnackBars de l'application.
/// Normalise les messages serveur en messages courts et lisibles.
abstract class AppSnackBar {
  // ── Normalisation des messages serveur ─────────────────────────
  static String _normalize(String raw) {
    final msg = raw.replaceFirst(RegExp(r'^Exception:\s*'), '');

    if (msg.contains('Population insuffisante') || msg.contains('population insuffisante')) {
      return 'Population insuffisante — améliorez votre Ferme.';
    }
    if (msg.contains('Ressources insuffisantes') || msg.contains('ressources insuffisantes')) {
      return 'Ressources insuffisantes.';
    }
    if (msg.contains('File de construction pleine')) {
      return 'File de construction pleine (2 slots maximum).';
    }
    if (msg.contains('déjà en file de construction')) {
      return 'Ce bâtiment est déjà en file de construction.';
    }
    if (msg.contains('Prérequis non remplis') || msg.contains('Requiert')) {
      return msg; // garder le détail des prérequis
    }
    if (msg.contains('Vous devez construire')) {
      return msg; // garder le nom du bâtiment requis
    }
    if (msg.contains('Authentification requise') || msg.contains('Accès refusé')) {
      return 'Accès refusé.';
    }
    return msg;
  }

  // ── Style de base ───────────────────────────────────────────────
  static SnackBar _build({
    required String message,
    required Color  color,
    required IconData icon,
    Duration duration = const Duration(seconds: 4),
  }) {
    return SnackBar(
      content: Row(
        children: [
          Icon(icon, color: Colors.white, size: 16),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 13, color: Colors.white),
            ),
          ),
        ],
      ),
      backgroundColor: color,
      behavior:        SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      margin:          const EdgeInsets.fromLTRB(12, 0, 12, 12),
      duration:        duration,
    );
  }

  // ── API publique ────────────────────────────────────────────────

  /// Erreur (rouge) — normalise automatiquement le message serveur.
  static void error(BuildContext context, String raw) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(_build(
        message:  _normalize(raw),
        color:    const Color(0xFFB71C1C),
        icon:     Icons.error_outline,
        duration: const Duration(seconds: 4),
      ));
  }

  /// Succès (vert).
  static void success(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(_build(
        message:  message,
        color:    const Color(0xFF2E7D32),
        icon:     Icons.check_circle_outline,
        duration: const Duration(seconds: 3),
      ));
  }

  /// Info (bleu-gris).
  static void info(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(_build(
        message:  message,
        color:    const Color(0xFF37474F),
        icon:     Icons.info_outline,
        duration: const Duration(seconds: 3),
      ));
  }
}
