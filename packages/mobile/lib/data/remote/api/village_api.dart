import 'package:mobile_client/data/remote/api/api_client.dart';
import 'package:mobile_client/data/dto/village_dto.dart';

class VillageApi {
  final ApiClient _client;

  VillageApi(this._client);

  Future<VillageDto> getVillage(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId');
    return VillageDto.fromJson(response.data as Map<String, dynamic>);
  }

  Future<VillageBuildingsDto> getBuildings(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId/buildings');
    return VillageBuildingsDto.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> upgrade(String villageId, String buildingId) async {
    final response = await _client.dio.post(
      '/villages/$villageId/upgrade',
      data: {'buildingId': buildingId},
    );
    return response.data as Map<String, dynamic>;
  }
}
