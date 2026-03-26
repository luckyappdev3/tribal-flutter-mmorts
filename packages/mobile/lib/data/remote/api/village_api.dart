import 'package:mobile_client/data/remote/api/api_client.dart';
import 'package:mobile_client/data/dto/village_dto.dart';

class VillageApi {
  final ApiClient _client;

  VillageApi(this._client);

  Future<List<MyVillageItemDto>> getMyVillages() async {
    final response = await _client.dio.get('/villages/my');
    final data = response.data as List<dynamic>;
    return data
        .map((e) => MyVillageItemDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<VillageDto> getVillage(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId');
    return VillageDto.fromJson(response.data as Map<String, dynamic>);
  }

  Future<VillageBuildingsDto> getBuildings(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId/buildings');
    return VillageBuildingsDto.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> spawnVillage() async {
    final response = await _client.dio.post('/villages/spawn', data: {});
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> upgrade(String villageId, String buildingId) async {
    final response = await _client.dio.post(
      '/villages/$villageId/upgrade',
      data: {'buildingId': buildingId},
    );
    return response.data as Map<String, dynamic>;
  }
}
