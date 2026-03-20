import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/router/app_router.dart';
import 'presentation/movements/bloc/movements_bloc.dart';
import 'presentation/reports/bloc/reports_bloc.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => MovementsBloc()),
        BlocProvider(create: (_) => ReportsBloc()),
      ],
      child: MaterialApp.router(
        title: 'MMORTS Kingdom',
        debugShowCheckedModeBanner: false,
        routerConfig: appRouter,
        theme: ThemeData(
          brightness: Brightness.dark,
          primaryColor: Colors.amber[800],
          scaffoldBackgroundColor: const Color(0xFF1A1A1A),
        ),
      ),
    );
  }
}