import 'package:go_router/go_router.dart';
import '../../presentation/auth/pages/login_page.dart';
import '../../presentation/auth/pages/register_page.dart';
import '../../presentation/village/pages/village_page.dart';
import '../../presentation/construction/pages/construction_page.dart';
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
      path: '/register',
      name: RouteNames.register,
      builder: (context, state) => const RegisterPage(),
    ),
    GoRoute(
      path: '/',
      name: RouteNames.village,
      builder: (context, state) => const VillagePage(),
    ),
    GoRoute(
      path: '/construction',
      name: RouteNames.construction,
      builder: (context, state) => const ConstructionPage(),
    ),
  ],
);
