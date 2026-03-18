import 'package:mobile_client/data/remote/api/api_client.dart';
import '../../../presentation/map/bloc/map_state.dart';

class MapApi {
  final ApiClient _client;
  MapApi(this._client);

  Future<List<VillageMarker>> getMap({
    int x = 500,
    int y = 500,
    int radius = 15,
  }) async {
    final response = await _client.dio.get(
      '/map',
      queryParameters: {'x': x, 'y': y, 'radius': radius},
    );
    final data = response.data as List<dynamic>;
    return data
        .map((v) => VillageMarker.fromJson(v as Map<String, dynamic>))
        .toList();
  }
}
