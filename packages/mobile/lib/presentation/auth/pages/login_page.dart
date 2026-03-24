import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/app_snack_bar.dart';
import '../../../../data/remote/api/auth_api.dart';
import '../../../../data/remote/websocket/socket_service.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../presentation/movements/bloc/movements_bloc.dart';
import '../../../../presentation/movements/bloc/movements_event.dart';
import '../../../../presentation/reports/bloc/reports_bloc.dart';
import '../../../../presentation/reports/bloc/reports_event.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController    = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _handleLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) return;

    setState(() => _isLoading = true);

    try {
      final authApi = getIt<AuthApi>();
      final result  = await authApi.login(_emailController.text.trim(), _passwordController.text);

      final String token     = result['token'];
      final String villageId = result['villageId'].toString();

      final socketService = getIt<SocketService>();
      socketService.init(baseUrl: 'http://localhost:3000', token: token);
      socketService.connect();
      socketService.joinVillage(villageId);

          if (mounted) {
      // Déclencher le chargement des blocs globaux avec le villageId
      context.read<MovementsBloc>().add(MovementsEvent.loadRequested(villageId));
      context.read<ReportsBloc>().add(ReportsEvent.loadRequested(villageId));
      context.go('/');
    }
    } catch (e) {
      if (mounted) {
        AppSnackBar.error(context, 'Identifiants invalides.');
      }
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
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 48),
              const Icon(Icons.shield, size: 80, color: Colors.amber),
              const SizedBox(height: 16),
              const Text(
                'MMORTS',
                style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: 4),
              ),
              const SizedBox(height: 4),
              const Text(
                'Entrez dans votre Royaume',
                style: TextStyle(color: Colors.white54, fontSize: 14),
              ),
              const SizedBox(height: 48),

              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDec('Email', Icons.email),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDec('Mot de passe', Icons.lock),
              ),
              const SizedBox(height: 32),

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
                  onPressed: _isLoading ? null : _handleLogin,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                      : const Text(
                          'ENTRER DANS LE JEU',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1),
                        ),
                ),
              ),

              const SizedBox(height: 20),
              TextButton(
                onPressed: () => context.goNamed('register'),
                child: const Text(
                  'Pas encore de compte ? S\'inscrire',
                  style: TextStyle(color: Colors.amber),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDec(String label, IconData icon) {
    return InputDecoration(
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
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
