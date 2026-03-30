import 'package:hive/hive.dart';
import 'api_client.dart';

class GameApi {
  final ApiClient _client;
  GameApi(this._client);

  /// Crée une partie en statut 'lobby'. Retourne { gameId, status }.
  Future<Map<String, dynamic>> createGame({
    required int botCount,
    required int botLevel,
    required double gameSpeed,
  }) async {
    final response = await _client.dio.post('/games', data: {
      'botCount':  botCount,
      'botLevel':  botLevel,
      'gameSpeed': gameSpeed,
    });
    return response.data as Map<String, dynamic>;
  }

  /// Démarre la partie : génère le village joueur + bots.
  /// Retourne { villageId, villageX, villageY }.
  Future<Map<String, dynamic>> startGame(String gameId) async {
    final response = await _client.dio.post('/games/$gameId/start', data: {});
    final data = response.data as Map<String, dynamic>;
    await _saveVillageSession(data);
    return data;
  }

  Future<void> _saveVillageSession(Map<String, dynamic> data) async {
    final villageBox = Hive.box('village');
    if (data['villageId'] != null) {
      await villageBox.put('current_village_id', data['villageId']);
    }
    if (data['villageX'] != null) {
      await villageBox.put('village_x', data['villageX']);
    }
    if (data['villageY'] != null) {
      await villageBox.put('village_y', data['villageY']);
    }
  }
}
