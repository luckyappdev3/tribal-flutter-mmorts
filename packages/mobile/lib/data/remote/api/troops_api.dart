import 'package:dio/dio.dart';
import 'package:mobile_client/data/remote/api/api_client.dart';
import '../../../presentation/troops/dto/troops_dto.dart';

String _extractServerMessage(DioException e) {
  final data = e.response?.data;
  if (data is Map) {
    final msg = data['error'] ?? data['message'];
    if (msg is String && msg.isNotEmpty) return msg;
  }
  return 'Erreur lors du recrutement.';
}

class TroopsApi {
  final ApiClient _client;
  TroopsApi(this._client);

  Future<TroopsResponseDto> getTroops(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId/troops');
    return TroopsResponseDto.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> recruit(
      String villageId, String unitType, int count) async {
    try {
      final response = await _client.dio.post(
        '/villages/$villageId/recruit',
        data: {'unitType': unitType, 'count': count},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractServerMessage(e));
    }
  }

  Future<Map<String, dynamic>> sendAttack(
    String attackerVillageId,
    String defenderVillageId,
    Map<String, int> units, {
    String? catapultTarget,
  }) async {
    final response = await _client.dio.post(
      '/villages/$attackerVillageId/attack',
      data: {
        'defenderVillageId': defenderVillageId,
        'units': units,
        if (catapultTarget != null) 'catapultTarget': catapultTarget,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sendSupport(
    String fromVillageId,
    String targetVillageId,
    Map<String, int> units,
  ) async {
    try {
      final response = await _client.dio.post(
        '/villages/$fromVillageId/support',
        data: {'targetVillageId': targetVillageId, 'units': units},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg  = (data is Map ? (data['error'] ?? data['message']) : null) ?? '$e';
      throw Exception(msg);
    }
  }

  Future<Map<String, dynamic>> recallSupport(
      String fromVillageId, String supportId) async {
    try {
      final response = await _client.dio
          .delete('/villages/$fromVillageId/support/$supportId');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg  = (data is Map ? (data['error'] ?? data['message']) : null) ?? '$e';
      throw Exception(msg);
    }
  }

  Future<Map<String, dynamic>> getSupports(String villageId) async {
    final response =
        await _client.dio.get('/villages/$villageId/supports');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> cancelRecruit(String villageId, String queueId) async {
    final response = await _client.dio.delete('/villages/$villageId/recruit/$queueId');
    return response.data as Map<String, dynamic>;
  }

  Future<List<CombatReportDto>> getCombatReports(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId/combat-reports');
    final data = response.data as List<dynamic>;
    return data
        .map((r) => CombatReportDto.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  Future<List<CombatReportDto>> getMyPlayerCombatReports() async {
    final response = await _client.dio.get('/villages/me/combat-reports');
    final data = response.data as List<dynamic>;
    return data
        .map((r) => CombatReportDto.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> sendScout(
    String attackerVillageId,
    String defenderVillageId,
    int scoutCount,
  ) async {
    final response = await _client.dio.post(
      '/villages/$attackerVillageId/scout',
      data: {
        'defenderVillageId': defenderVillageId,
        'scoutCount': scoutCount,
      },
    );
    return response.data as Map<String, dynamic>;
  }
}
