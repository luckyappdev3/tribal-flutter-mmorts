import 'package:dio/dio.dart';
import 'package:hive/hive.dart';

class ApiClient {
  late final Dio dio;
  
  // Utilisation de l'URL pour simulateur iOS. 
  // Rappel : Utilise 10.0.2.2 pour Android Emulator.
  final String baseUrl = "http://localhost:3000/api";

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 3),
      contentType: 'application/json',
    ));

    // INTERCEPTEUR JWT 
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
  final authBox = Hive.box('auth');  // ← utilise la box déjà ouverte
  final String? token = authBox.get('jwt_token');
  if (token != null) {
    options.headers['Authorization'] = 'Bearer $token';
  }
  return handler.next(options);
},
onError: (DioException e, handler) {
  if (e.response?.statusCode == 401) {
    print("Erreur d'authentification : Token invalide.");
  }
  return handler.next(e);
},
    ));
  }
}