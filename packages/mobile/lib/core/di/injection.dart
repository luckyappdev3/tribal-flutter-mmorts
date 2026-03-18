import 'package:get_it/get_it.dart';
import '../../data/remote/api/api_client.dart';
import '../../data/remote/api/auth_api.dart';
import '../../data/remote/api/village_api.dart';
import '../../data/remote/api/map_api.dart';
import '../../data/remote/websocket/socket_service.dart';

final getIt = GetIt.instance;

Future<void> configureDependencies() async {
  getIt.registerSingleton<ApiClient>(ApiClient());
  getIt.registerLazySingleton<AuthApi>(() => AuthApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<VillageApi>(() => VillageApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<MapApi>(() => MapApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<SocketService>(() => SocketService());
}
