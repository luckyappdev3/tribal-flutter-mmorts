import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/app_snack_bar.dart';
import '../../../../data/remote/api/auth_api.dart';
import '../../../../data/remote/websocket/socket_service.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _usernameController = TextEditingController();
  final _emailController    = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _handleRegister() async {
    final username = _usernameController.text.trim();
    final email    = _emailController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty || email.isEmpty || password.isEmpty) {
      _showSnack('Tous les champs sont obligatoires.', Colors.red);
      return;
    }
    if (password.length < 6) {
      _showSnack('Le mot de passe doit faire au moins 6 caractères.', Colors.red);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authApi = getIt<AuthApi>();
      final result  = await authApi.register(username, email, password);

      // Initialisation du socket après inscription
      final token     = result['token'] as String;
      final villageId = result['villageId']?.toString();

      final socketService = getIt<SocketService>();
      socketService.init(baseUrl: 'http://localhost:3000', token: token);
      socketService.connect();
      if (villageId != null) socketService.joinVillage(villageId);

      if (mounted) {
        _showSnack('Bienvenue, $username ! Configurez votre partie.', Colors.green);
        context.go('/lobby');
      }
    } catch (e) {
      if (mounted) {
        _showSnack('Inscription impossible : $e', Colors.red);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnack(String message, Color color) {
    if (color == Colors.green) {
      AppSnackBar.success(context, message);
    } else {
      AppSnackBar.error(context, message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      appBar: AppBar(
        title: const Text('Créer un compte'),
        backgroundColor: Colors.black54,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 24),
              const Icon(Icons.shield, size: 72, color: Colors.amber),
              const SizedBox(height: 8),
              const Text(
                'Fondez votre Royaume',
                style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                'Créez votre compte pour commencer à jouer',
                style: TextStyle(color: Colors.white54, fontSize: 13),
              ),
              const SizedBox(height: 36),

              _Field(
                controller: _usernameController,
                label: 'Nom de souverain',
                icon: Icons.person,
              ),
              const SizedBox(height: 16),
              _Field(
                controller: _emailController,
                label: 'Email',
                icon: Icons.email,
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              _Field(
                controller: _passwordController,
                label: 'Mot de passe',
                icon: Icons.lock,
                obscureText: true,
              ),
              const SizedBox(height: 24),

              const SizedBox(height: 8),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber[800],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 4,
                  ),
                  onPressed: _isLoading ? null : _handleRegister,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                      : const Text(
                          'FONDER MON ROYAUME',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1),
                        ),
                ),
              ),

              const SizedBox(height: 20),
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text(
                  'Déjà un compte ? Se connecter',
                  style: TextStyle(color: Colors.amber),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}


class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscureText;
  final TextInputType? keyboardType;

  const _Field({
    required this.controller,
    required this.label,
    required this.icon,
    this.obscureText = false,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white54),
        prefixIcon: Icon(icon, color: Colors.amber),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.white24),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.amber),
        ),
        filled: true,
        fillColor: const Color(0xFF262626),
      ),
    );
  }
}
