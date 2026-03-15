import 'package:go_router/go_router.dart';
import '../../presentation/auth/pages/login_page.dart';
import '../../presentation/village/pages/village_page.dart';
import 'route_names.dart';

final appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      name: RouteNames.login,
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: '/',
      name: RouteNames.village,
      builder: (context, state) => const VillagePage(),
    ),
  ],
);