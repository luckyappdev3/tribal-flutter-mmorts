import 'package:flutter/material.dart';
import 'core/router/app_router.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // .router est la clé pour activer GoRouter
    return MaterialApp.router(
      title: 'MMORTS Kingdom',
      debugShowCheckedModeBanner: false,
      routerConfig: appRouter, // On lie notre configuration ici
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: Colors.amber[800],
        scaffoldBackgroundColor: const Color(0xFF1A1A1A),
      ),
    );
  }
}