import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/app_snack_bar.dart';
import '../../../../data/remote/api/game_api.dart';
import '../../../../data/remote/websocket/socket_service.dart';
import 'package:hive/hive.dart';

class LobbyPage extends StatefulWidget {
  const LobbyPage({super.key});

  @override
  State<LobbyPage> createState() => _LobbyPageState();
}

class _LobbyPageState extends State<LobbyPage> {
  int    _botCount = 3;
  int    _botLevel = 5;
  double _gameSpeed = 200;

  // Vitesses prédéfinies pour les chips
  static const _speedPresets = [1.0, 10.0, 50.0, 200.0, 1000.0, 5000.0, 20000.0];

  final _customSpeedController = TextEditingController();
  bool  _useCustomSpeed = false;
  bool  _isLoading      = false;

  @override
  void dispose() {
    _customSpeedController.dispose();
    super.dispose();
  }

  Future<void> _handleStart() async {
    setState(() => _isLoading = true);
    try {
      final speed = _useCustomSpeed
          ? (double.tryParse(_customSpeedController.text) ?? _gameSpeed)
              .clamp(1.0, 20000.0)
          : _gameSpeed;

      final gameApi = getIt<GameApi>();

      // 1. Créer la partie
      final created = await gameApi.createGame(
        botCount:  _botCount,
        botLevel:  _botLevel,
        gameSpeed: speed,
      );
      final gameId = created['gameId'] as String;

      // 2. Démarrer (génère villages + bots)
      final started = await gameApi.startGame(gameId);

      // 3. Connecter le socket au village
      final villageId = started['villageId'] as String?;
      if (villageId != null) {
        final token = Hive.box('auth').get('jwt_token') as String?;
        if (token != null) {
          final socketService = getIt<SocketService>();
          socketService.init(baseUrl: 'http://localhost:3000', token: token);
          socketService.connect();
          socketService.joinVillage(villageId);
        }
      }

      if (mounted) context.go('/');
    } catch (e) {
      if (mounted) AppSnackBar.error(context, 'Erreur au démarrage : $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── En-tête ────────────────────────────────────
              Center(
                child: Column(children: [
                  const Icon(Icons.military_tech, size: 64, color: Colors.amber),
                  const SizedBox(height: 10),
                  const Text(
                    'NOUVELLE PARTIE',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Configurez votre partie et lancez le combat',
                    style: TextStyle(color: Colors.white54, fontSize: 13),
                  ),
                ]),
              ),

              const SizedBox(height: 36),

              // ── Nombre de bots ─────────────────────────────
              _SectionTitle(label: 'Adversaires', icon: Icons.group),
              const SizedBox(height: 12),
              _BotCountPicker(
                value:     _botCount,
                onChanged: (v) => setState(() => _botCount = v),
              ),

              const SizedBox(height: 28),

              // ── Niveau des bots ────────────────────────────
              _SectionTitle(label: 'Niveau des bots', icon: Icons.psychology),
              const SizedBox(height: 12),
              _LevelPicker(
                value:     _botLevel,
                onChanged: (v) => setState(() => _botLevel = v),
              ),

              const SizedBox(height: 28),

              // ── Vitesse de jeu ─────────────────────────────
              _SectionTitle(label: 'Vitesse de jeu', icon: Icons.speed),
              const SizedBox(height: 12),
              _SpeedPicker(
                selected:            _useCustomSpeed ? null : _gameSpeed,
                presets:             _speedPresets,
                customController:    _customSpeedController,
                useCustom:           _useCustomSpeed,
                onPresetSelected:    (v) => setState(() { _gameSpeed = v; _useCustomSpeed = false; }),
                onCustomToggled:     ()  => setState(() => _useCustomSpeed = !_useCustomSpeed),
              ),

              const SizedBox(height: 40),

              // ── Bouton LANCER ──────────────────────────────
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber[800],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 6,
                  ),
                  onPressed: _isLoading ? null : _handleStart,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.play_arrow_rounded, size: 26),
                            SizedBox(width: 8),
                            Text(
                              'LANCER LA PARTIE',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                letterSpacing: 1.5,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Titre de section ──────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  final String  label;
  final IconData icon;
  const _SectionTitle({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, color: Colors.amber, size: 18),
      const SizedBox(width: 8),
      Text(label, style: const TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600)),
    ]);
  }
}

// ── Sélecteur nombre de bots (1–7) ───────────────────────────

class _BotCountPicker extends StatelessWidget {
  final int value;
  final ValueChanged<int> onChanged;
  const _BotCountPicker({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(7, (i) {
        final n        = i + 1;
        final selected = n == value;
        return GestureDetector(
          onTap: () => onChanged(n),
          child: Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color:        selected ? Colors.amber[800] : const Color(0xFF2A2A2A),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected ? Colors.amber : Colors.white24,
                width: selected ? 1.5 : 1.0,
              ),
            ),
            child: Center(
              child: Text(
                '$n',
                style: TextStyle(
                  color:      selected ? Colors.white : Colors.white54,
                  fontSize:   15,
                  fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

// ── Sélecteur niveau bot (1–10) ───────────────────────────────

class _LevelPicker extends StatelessWidget {
  final int value;
  final ValueChanged<int> onChanged;
  const _LevelPicker({required this.value, required this.onChanged});

  String get _description {
    if (value <= 3) return 'Bots lents, erreurs fréquentes, vision limitée à 5 cases';
    if (value <= 7) return 'Bots équilibrés, jeu correct, comme un joueur ordinaire';
    return 'Bots quasi-parfaits, très réactifs, vision totale de la carte';
  }

  Color get _color {
    if (value <= 3) return Colors.green;
    if (value <= 7) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(10, (i) {
            final lvl      = i + 1;
            final selected = lvl == value;
            return GestureDetector(
              onTap: () => onChanged(lvl),
              child: Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  color:        selected ? _color : const Color(0xFF2A2A2A),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: selected ? _color : Colors.white24,
                    width: selected ? 1.5 : 1.0,
                  ),
                ),
                child: Center(
                  child: Text(
                    '$lvl',
                    style: TextStyle(
                      color:      selected ? Colors.white : Colors.white54,
                      fontSize:   11,
                      fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 6),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [
          Text('Débutant', style: TextStyle(color: Colors.white38, fontSize: 10)),
          Text('Expert',   style: TextStyle(color: Colors.white38, fontSize: 10)),
        ]),
        const SizedBox(height: 6),
        Text(_description, style: const TextStyle(color: Colors.white54, fontSize: 11)),
      ],
    );
  }
}

// ── Sélecteur vitesse (chips + champ libre) ───────────────────

class _SpeedPicker extends StatelessWidget {
  final double?                 selected;
  final List<double>            presets;
  final TextEditingController   customController;
  final bool                    useCustom;
  final ValueChanged<double>    onPresetSelected;
  final VoidCallback            onCustomToggled;

  const _SpeedPicker({
    required this.selected,
    required this.presets,
    required this.customController,
    required this.useCustom,
    required this.onPresetSelected,
    required this.onCustomToggled,
  });

  String _label(double v) {
    if (v >= 1000) return '×${(v / 1000).toStringAsFixed(0)}k';
    return '×${v.toInt()}';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ...presets.map((v) {
              final sel = !useCustom && selected == v;
              return GestureDetector(
                onTap: () => onPresetSelected(v),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color:        sel ? Colors.amber[800] : const Color(0xFF2A2A2A),
                    borderRadius: BorderRadius.circular(8),
                    border:       Border.all(color: sel ? Colors.amber : Colors.white24),
                  ),
                  child: Text(
                    _label(v),
                    style: TextStyle(
                      color:      sel ? Colors.white : Colors.white54,
                      fontSize:   13,
                      fontWeight: sel ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ),
              );
            }),
            // Chip "Personnalisé"
            GestureDetector(
              onTap: onCustomToggled,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color:        useCustom ? Colors.amber[800] : const Color(0xFF2A2A2A),
                  borderRadius: BorderRadius.circular(8),
                  border:       Border.all(color: useCustom ? Colors.amber : Colors.white24),
                ),
                child: Text(
                  'Autre',
                  style: TextStyle(
                    color:      useCustom ? Colors.white : Colors.white54,
                    fontSize:   13,
                    fontWeight: useCustom ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            ),
          ],
        ),
        if (useCustom) ...[
          const SizedBox(height: 12),
          TextField(
            controller:   customController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText:    'Entrez une vitesse (1 – 20 000)',
              hintStyle:   const TextStyle(color: Colors.white38),
              prefixIcon:  const Icon(Icons.speed, color: Colors.amber),
              suffixText:  '×',
              suffixStyle: const TextStyle(color: Colors.white54),
              border:        OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Colors.white24),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Colors.amber),
              ),
              filled:     true,
              fillColor:  const Color(0xFF262626),
            ),
          ),
        ],
      ],
    );
  }
}
