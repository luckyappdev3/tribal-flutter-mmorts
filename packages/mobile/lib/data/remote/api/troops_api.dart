import 'package:mobile_client/data/remote/api/api_client.dart';
import '../../../presentation/troops/dto/troops_dto.dart';

class TroopsApi {
  final ApiClient _client;
  TroopsApi(this._client);

  Future<TroopsResponseDto> getTroops(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId/troops');
    return TroopsResponseDto.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> recruit(
      String villageId, String unitType, int count) async {
    final response = await _client.dio.post(
      '/villages/$villageId/recruit',
      data: {'unitType': unitType, 'count': count},
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sendAttack(
    String attackerVillageId,
    String defenderVillageId,
    Map<String, int> units,
  ) async {
    final response = await _client.dio.post(
      '/villages/$attackerVillageId/attack',
      data: {
        'defenderVillageId': defenderVillageId,
        'units': units,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<List<AttackReportDto>> getReports(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId/reports');
    final data = response.data as List<dynamic>;
    return data
        .map((r) => AttackReportDto.fromJson(r as Map<String, dynamic>))
        .toList();
  }
}
