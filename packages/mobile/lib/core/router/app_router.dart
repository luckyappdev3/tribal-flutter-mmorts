import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/auth/pages/login_page.dart';
import '../../presentation/auth/pages/register_page.dart';
import '../../presentation/village/pages/village_page.dart';
import '../../presentation/construction/pages/construction_page.dart';
import '../../presentation/map/pages/map_page.dart';
import '../../presentation/troops/pages/troops_page.dart';
import '../../presentation/movements/pages/movements_page.dart';
import '../../presentation/reports/pages/reports_page.dart';
import '../../presentation/attack/pages/attack_page.dart';
import '../../presentation/movements/bloc/movements_bloc.dart';
import 'route_names.dart';

final appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login',    name: RouteNames.login,    builder: (_, __) => const LoginPage()),
    GoRoute(path: '/register', name: RouteNames.register, builder: (_, __) => const RegisterPage()),
    GoRoute(
      path: '/attack',
      name: RouteNames.attack,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>;
        return AttackPage(
          defenderVillageId:  extra['defenderVillageId']  as String,
          defenderName:       extra['defenderName']       as String,
          defenderPlayerName: extra['defenderPlayerName'] as String,
        );
      },
    ),

    // Shell 6 onglets
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => _ScaffoldWithNavBar(shell: shell),
      branches: [
        StatefulShellBranch(routes: [GoRoute(path: '/',             name: RouteNames.village,      builder: (_, __) => const VillagePage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/construction', name: RouteNames.construction, builder: (_, __) => const ConstructionPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/map',          name: RouteNames.map,          builder: (_, __) => const MapPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/troops',       name: RouteNames.troops,       builder: (_, __) => const TroopsPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/movements',    name: RouteNames.movements,    builder: (_, __) => const MovementsPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/reports',      name: RouteNames.reports,      builder: (_, __) => const ReportsPage())]),
      ],
    ),
  ],
);

class _ScaffoldWithNavBar extends StatelessWidget {
  final StatefulNavigationShell shell;
  const _ScaffoldWithNavBar({required this.shell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      body: shell,
      bottomNavigationBar: _BottomNav(
        currentIndex: shell.currentIndex,
        onTap: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  const _BottomNav({required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    // Écouter le MovementsBloc pour le badge sur Rapports
    final hasNewReport = context.select<MovementsBloc, bool>(
      (bloc) => bloc.state.maybeWhen(
        loaded: (_, __, ___, hasNew) => hasNew,
        orElse: () => false,
      ),
    );

    return Container(
      decoration: const BoxDecoration(
        color: Colors.black87,
        border: Border(top: BorderSide(color: Colors.white12, width: 0.5)),
      ),
      child: NavigationBar(
        backgroundColor: Colors.transparent,
        indicatorColor: Colors.amber.withOpacity(0.15),
        selectedIndex: currentIndex,
        onDestinationSelected: onTap,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.fort_outlined,      color: Colors.white38),
            selectedIcon: Icon(Icons.fort,       color: Colors.amber),
            label: 'Village',
          ),
          const NavigationDestination(
            icon: Icon(Icons.construction_outlined, color: Colors.white38),
            selectedIcon: Icon(Icons.construction,  color: Colors.amber),
            label: 'Construire',
          ),
          const NavigationDestination(
            icon: Icon(Icons.map_outlined, color: Colors.white38),
            selectedIcon: Icon(Icons.map,  color: Colors.amber),
            label: 'Carte',
          ),
          const NavigationDestination(
            icon: Icon(Icons.shield_outlined, color: Colors.white38),
            selectedIcon: Icon(Icons.shield,  color: Colors.amber),
            label: 'Troupes',
          ),
          const NavigationDestination(
            icon: Icon(Icons.directions_run_outlined, color: Colors.white38),
            selectedIcon: Icon(Icons.directions_run,  color: Colors.amber),
            label: 'Mouvements',
          ),
          NavigationDestination(
            icon: _BadgeIcon(show: hasNewReport,
              child: const Icon(Icons.article_outlined, color: Colors.white38)),
            selectedIcon: _BadgeIcon(show: hasNewReport,
              child: const Icon(Icons.article, color: Colors.amber)),
            label: 'Rapports',
          ),
        ],
      ),
    );
  }
}

// Badge rouge sur l'icône
class _BadgeIcon extends StatelessWidget {
  final Widget child;
  final bool   show;
  const _BadgeIcon({required this.child, required this.show});

  @override
  Widget build(BuildContext context) {
    if (!show) return child;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned(
          top: -2, right: -2,
          child: Container(
            width: 8, height: 8,
            decoration: const BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
            ),
          ),
        ),
      ],
    );
  }
}
