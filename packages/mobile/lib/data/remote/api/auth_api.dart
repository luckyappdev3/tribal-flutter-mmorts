import 'api_client.dart';
import 'package:hive/hive.dart';

class AuthApi {
  final ApiClient _client;
  AuthApi(this._client);

  Future<Map<String, dynamic>> register(
      String username, String email, String password) async {
    try {
      final response = await _client.dio.post('/auth/register', data: {
        'username': username,
        'email':    email,
        'password': password,
      });
      final data = response.data;
      await _saveSession(data);
      return data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _client.dio.post('/auth/login', data: {
        'email':    email,
        'password': password,
      });
      final data = response.data;
      await _saveSession(data);
      return data;
    } catch (e) {
      rethrow;
    }
  }

  // Sauvegarde tout ce dont l'app a besoin après login/register
  Future<void> _saveSession(Map<String, dynamic> data) async {
    final authBox    = Hive.box('auth');
    final villageBox = Hive.box('village');

    // Token JWT
    if (data['token'] != null) {
      await authBox.put('jwt_token', data['token']);
    }

    // ID du joueur → utilisé par la carte pour colorier "mon village"
    if (data['player'] != null) {
      await authBox.put('player_id', data['player']['id']);
    }

    // ID + coordonnées du village → utilisé pour centrer la carte
    if (data['villageId'] != null) {
      await villageBox.put('current_village_id', data['villageId']);
    }
    if (data['villageX'] != null) {
      await villageBox.put('village_x', data['villageX']);
    }
    if (data['villageY'] != null) {
      await villageBox.put('village_y', data['villageY']);
    }

    print('💾 Session sauvegardée — playerId: ${data['player']?['id']}, '
        'village: (${data['villageX']}, ${data['villageY']})');
  }
}
