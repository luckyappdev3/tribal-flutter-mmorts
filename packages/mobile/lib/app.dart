import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/router/app_router.dart';
import 'presentation/movements/bloc/movements_bloc.dart';
import 'presentation/movements/bloc/movements_event.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final String? villageId =
        Hive.box('village').get('current_village_id') as String?;

    return BlocProvider(
      // MovementsBloc global → permet au badge dans la bottom nav de fonctionner
      create: (_) => villageId != null
          ? (MovementsBloc()..add(MovementsEvent.loadRequested(villageId)))
          : MovementsBloc(),
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
