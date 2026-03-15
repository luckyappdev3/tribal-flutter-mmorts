import 'package:get_it/get_it.dart';
import '../../data/remote/api/api_client.dart';
import '../../data/remote/api/auth_api.dart';
import '../../data/remote/websocket/socket_service.dart';

final getIt = GetIt.instance;

Future<void> configureDependencies() async {
  // Services Réseau & API [cite: 115, 118]
  getIt.registerSingleton<ApiClient>(ApiClient());
  getIt.registerLazySingleton<AuthApi>(() => AuthApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<SocketService>(() => SocketService());
  
  // Tu ajouteras tes Repositories ici plus tard [cite: 127]
}