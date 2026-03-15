import 'api_client.dart';
import 'package:hive/hive.dart';

class AuthApi {
  final ApiClient _client;

  AuthApi(this._client);

  Future<Map<String, dynamic>> register(String username, String email, String password) async {
    try {
      final response = await _client.dio.post('/auth/register', data: {
        'username': username,
        'email': email,
        'password': password,
      });

      final data = response.data;

      // 1. Stockage du token
      var authBox = await Hive.openBox('auth');
      await authBox.put('jwt_token', data['token']);

      // 2. Stockage du villageId (essentiel pour charger le village après inscription)
      if (data['villageId'] != null) {
        var villageBox = await Hive.openBox('village');
        await villageBox.put('current_village_id', data['villageId']);
      }

      return data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _client.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      
      final data = response.data;

      // 1. Stockage du token
      var authBox = await Hive.openBox('auth');
      await authBox.put('jwt_token', data['token']);
      
      // 2. Stockage du villageId à la racine du JSON
      if (data['villageId'] != null) {
        var villageBox = await Hive.openBox('village');
        await villageBox.put('current_village_id', data['villageId']);
        print("💾 ID du village sauvegardé : ${data['villageId']}");
      } else {
        print("⚠️ Aucun villageId trouvé dans la réponse du serveur.");
      }
      
      return data;
    } catch (e) {
      rethrow;
    }
  }
}