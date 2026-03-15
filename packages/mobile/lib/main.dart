import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/di/injection.dart'; // Import crucial qui contient le "getIt" unique
import 'app.dart';

void main() async {
  // 1. Initialisation des bindings Flutter
  WidgetsFlutterBinding.ensureInitialized();

  // 2. Initialisation de Hive (Persistance locale)
  await Hive.initFlutter();
  await Hive.openBox('auth');
  await Hive.openBox('village');

  // 3. Initialisation de l'injection de dépendances (GetIt)
  // On utilise await car configureDependencies pourrait devenir asynchrone
  await configureDependencies();

  // 4. Lancement de l'application
  runApp(const MyApp());
}