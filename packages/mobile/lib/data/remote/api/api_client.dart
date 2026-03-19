import 'package:dio/dio.dart';
import 'package:hive/hive.dart';
import 'package:mobile_client/core/router/app_router.dart';

class ApiClient {
  late final Dio dio;

  final String baseUrl = 'http://localhost:3000/api';

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl:        baseUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 10),
      contentType:    'application/json',
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = Hive.box('auth').get('jwt_token') as String?;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },

      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          // Token expiré → vider la session et rediriger vers login
          await Hive.box('auth').clear();
          await Hive.box('village').clear();
          appRouter.goNamed('login');
        }
        return handler.next(e);
      },
    ));
  }
}
