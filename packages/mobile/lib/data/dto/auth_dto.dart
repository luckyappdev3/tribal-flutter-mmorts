class LoginResponseDto {
  final String token;
  final String userId;
  final String? villageId;

  LoginResponseDto({required this.token, required this.userId, this.villageId});

  factory LoginResponseDto.fromJson(Map<String, dynamic> json) {
  return LoginResponseDto(
    token: json['token'],
    userId: json['player']['id'],
    // On va chercher le villageId s'il est présent dans l'objet player
    villageId: json['player']['villageId'] ?? json['villageId'], 
  );
}

}