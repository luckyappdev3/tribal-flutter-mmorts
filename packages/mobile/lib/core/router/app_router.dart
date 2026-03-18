import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/auth/pages/login_page.dart';
import '../../presentation/auth/pages/register_page.dart';
import '../../presentation/village/pages/village_page.dart';
import '../../presentation/construction/pages/construction_page.dart';
import '../../presentation/map/pages/map_page.dart';
import '../../presentation/reports/pages/reports_page.dart';
import 'route_names.dart';

// Clé globale pour accéder au navigator du shell depuis n'importe où


final appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    // ── Routes hors bottom nav (auth) ──
    GoRoute(
      path: '/login',
      name: RouteNames.login,
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: '/register',
      name: RouteNames.register,
      builder: (context, state) => const RegisterPage(),
    ),

    // ── Shell avec bottom navigation bar ──
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          _ScaffoldWithNavBar(navigationShell: navigationShell),
      branches: [
        // Onglet 0 — Village
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/',
              name: RouteNames.village,
              builder: (context, state) => const VillagePage(),
            ),
          ],
        ),
        // Onglet 1 — Construction
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/construction',
              name: RouteNames.construction,
              builder: (context, state) => const ConstructionPage(),
            ),
          ],
        ),
        // Onglet 2 — Carte
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/map',
              name: RouteNames.map,
              builder: (context, state) => const MapPage(),
            ),
          ],
        ),
        // Onglet 3 — Rapports
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/reports',
              name: RouteNames.reports,
              builder: (context, state) => const ReportsPage(),
            ),
          ],
        ),
      ],
    ),
  ],
);

// ── Scaffold avec bottom navigation bar ──
class _ScaffoldWithNavBar extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const _ScaffoldWithNavBar({required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      body: navigationShell,
      bottomNavigationBar: _BottomNav(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) => navigationShell.goBranch(
          index,
          // Si on retap l'onglet actif → revenir à la racine de ce branch
          initialLocation: index == navigationShell.currentIndex,
        ),
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
        destinations: const [
          NavigationDestination(
            icon:         Icon(Icons.fort_outlined,     color: Colors.white38),
            selectedIcon: Icon(Icons.fort,              color: Colors.amber),
            label: 'Village',
          ),
          NavigationDestination(
            icon:         Icon(Icons.construction_outlined, color: Colors.white38),
            selectedIcon: Icon(Icons.construction,         color: Colors.amber),
            label: 'Construire',
          ),
          NavigationDestination(
            icon:         Icon(Icons.map_outlined, color: Colors.white38),
            selectedIcon: Icon(Icons.map,          color: Colors.amber),
            label: 'Carte',
          ),
          NavigationDestination(
            icon:         Icon(Icons.article_outlined, color: Colors.white38),
            selectedIcon: Icon(Icons.article,          color: Colors.amber),
            label: 'Rapports',
          ),
        ],
      ),
    );
  }
}
