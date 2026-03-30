import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:hive/hive.dart';
import '../../core/services/tab_refresh_service.dart';
import '../../data/remote/websocket/socket_service.dart';
import '../../core/di/injection.dart';
import '../../presentation/auth/pages/login_page.dart';
import '../../presentation/auth/pages/register_page.dart';
import '../../presentation/lobby/pages/lobby_page.dart';
import '../../presentation/game-over/pages/game_over_page.dart';
import '../../presentation/village/pages/village_page.dart';
import '../../presentation/construction/pages/construction_page.dart';
import '../../presentation/map/pages/map_page.dart';
import '../../presentation/troops/pages/troops_page.dart';
import '../../presentation/movements/pages/movements_page.dart';
import '../../presentation/reports/pages/reports_page.dart';
import '../../presentation/ranking/pages/ranking_page.dart';
import '../../presentation/attack/pages/attack_page.dart';
import '../../presentation/movements/bloc/movements_bloc.dart';
import '../resources/global_resources_cubit.dart';
import '../widgets/global_top_bar.dart';
import 'route_names.dart';

final appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login',    name: RouteNames.login,    builder: (_, __) => const LoginPage()),
    GoRoute(path: '/register', name: RouteNames.register, builder: (_, __) => const RegisterPage()),
    GoRoute(path: '/lobby',    name: RouteNames.lobby,    builder: (_, __) => const LobbyPage()),
    GoRoute(
      path: '/game-over',
      name: RouteNames.gameOver,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return GameOverPage(
          isVictory:  extra['isVictory']  as bool? ?? false,
          winnerId:   extra['winnerId']   as String? ?? '',
          winnerName: extra['winnerName'] as String? ?? '?',
          duration:   extra['duration']   as int? ?? 0,
        );
      },
    ),
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

    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => _ScaffoldWithNavBar(shell: shell),
      branches: [
        StatefulShellBranch(routes: [GoRoute(path: '/',             name: RouteNames.village,      builder: (_, __) => const VillagePage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/construction', name: RouteNames.construction, builder: (_, __) => const ConstructionPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/map',          name: RouteNames.map,          builder: (_, __) => const MapPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/troops',       name: RouteNames.troops,       builder: (_, __) => const TroopsPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/movements',    name: RouteNames.movements,    builder: (_, __) => const MovementsPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/reports',      name: RouteNames.reports,      builder: (_, __) => const ReportsPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/ranking',      name: RouteNames.ranking,      builder: (_, __) => const RankingPage())]),
      ],
    ),
  ],
);

class _ScaffoldWithNavBar extends StatefulWidget {
  final StatefulNavigationShell shell;
  const _ScaffoldWithNavBar({required this.shell});

  @override
  State<_ScaffoldWithNavBar> createState() => _ScaffoldWithNavBarState();
}

class _ScaffoldWithNavBarState extends State<_ScaffoldWithNavBar> {
  late final GlobalResourcesCubit _cubit;
  StreamSubscription? _loyaltySub;

  @override
  void initState() {
    super.initState();
    _cubit = GlobalResourcesCubit();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loyaltySub = _cubit.loyaltyWarnings.listen((w) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.orange[900],
            content: Row(children: [
              const Icon(Icons.warning_amber, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(
                '⚜️ ${w.villageName} — Loyauté critique : ${w.loyalty}/100',
                style: const TextStyle(color: Colors.white, fontSize: 13),
              )),
            ]),
            duration: const Duration(seconds: 5),
          ),
        );
      });

      // Écouter fin de partie (Phase 11)
      try {
        final socketService = getIt<SocketService>();
        socketService.instance.on('game:over', (data) {
          if (!mounted) return;
          final winnerId = data['winnerId'] as String?;
          final currentPlayerId = Hive.box('auth').get('player_id') as String?;
          final isVictory = winnerId == currentPlayerId;
          final winnerName = winnerId == currentPlayerId ? 'Vous' : '?';
          final duration = 0; // TODO: stocker startTime

          context.go(
            '/game-over',
            extra: {
              'isVictory':  isVictory,
              'winnerId':   winnerId ?? '',
              'winnerName': winnerName,
              'duration':   duration,
            },
          );
        });
      } catch (e) {
        print('⚠️ Erreur setup game:over listener: $e');
      }
    });
  }

  @override
  void dispose() {
    _loyaltySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _cubit),
        BlocProvider(create: (_) => MovementsBloc()),
      ],
      child: Scaffold(
        backgroundColor: const Color(0xFF1A1A1A),
        body: Column(
          children: [
            SafeArea(bottom: false, child: const GlobalTopBar()),
            Expanded(child: widget.shell),
          ],
        ),
        bottomNavigationBar: _BottomNav(
          currentIndex: widget.shell.currentIndex,
          onTap: (i) {
            TabRefreshService.instance.notifyTabSelected(i);
            widget.shell.goBranch(i, initialLocation: i == widget.shell.currentIndex);
          },
        ),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int             currentIndex;
  final ValueChanged<int> onTap;
  const _BottomNav({required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
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
          const NavigationDestination(
            icon: Icon(Icons.leaderboard_outlined, color: Colors.white38),
            selectedIcon: Icon(Icons.leaderboard,  color: Colors.amber),
            label: 'Classement',
          ),
        ],
      ),
    );
  }
}

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
            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
          ),
        ),
      ],
    );
  }
}
