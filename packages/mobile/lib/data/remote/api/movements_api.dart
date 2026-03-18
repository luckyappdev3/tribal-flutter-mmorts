import 'package:mobile_client/data/remote/api/api_client.dart';
import 'package:mobile_client/presentation/movements/dto/movements_dto.dart';

class MovementsApi {
  final ApiClient _client;
  MovementsApi(this._client);

  Future<List<MovementDto>> getMovements(String villageId) async {
    final response = await _client.dio.get('/villages/$villageId/movements');
    final data = response.data as List<dynamic>;
    return data
        .map((m) => MovementDto.fromJson(m as Map<String, dynamic>))
        .toList();
  }
}
