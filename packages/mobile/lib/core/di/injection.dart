import 'package:get_it/get_it.dart';
import '../../data/remote/api/api_client.dart';
import '../../data/remote/api/auth_api.dart';
import '../../data/remote/api/game_api.dart';
import '../../data/remote/api/village_api.dart';
import '../../data/remote/api/map_api.dart';
import '../../data/remote/api/troops_api.dart';
import '../../data/remote/api/movements_api.dart';
import '../../data/remote/websocket/socket_service.dart';

final getIt = GetIt.instance;

Future<void> configureDependencies() async {
  getIt.registerSingleton<ApiClient>(ApiClient());
  getIt.registerLazySingleton<AuthApi>(() => AuthApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<GameApi>(() => GameApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<VillageApi>(() => VillageApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<MapApi>(() => MapApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<TroopsApi>(() => TroopsApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<MovementsApi>(() => MovementsApi(getIt<ApiClient>()));
  getIt.registerLazySingleton<SocketService>(() => SocketService());
}
