import 'package:socket_io_client/socket_io_client.dart' as io;
import 'socket_events.dart';

class SocketService {
  // Utilisation d'un nullable pour éviter l'erreur de 'late' non initialisé 
  // si on appelle instance avant init
  io.Socket? _socket;

  // Accès sécurisé à l'instance
  io.Socket get instance {
    if (_socket == null) {
      throw Exception("SocketService must be initialized before use. Call init() first.");
    }
    return _socket!;
  }

  void init({required String baseUrl, required String token}) {
    _socket = io.io(
      baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .disableAutoConnect()
          .setReconnectionAttempts(5)
          .build(), // La virgule ici est cruciale pour la syntaxe
    );

    _setupBasicListeners();
  }

  void connect() {
    if (_socket != null && !_socket!.connected) {
      _socket!.connect();
    }
  }

  void _setupBasicListeners() {
    _socket?.onConnect((_) => print('🔌 Socket connecté au serveur MMORTS'));
    _socket?.onDisconnect((_) => print('🔌 Socket déconnecté'));
    _socket?.onConnectError((err) => print('❌ Erreur Connexion Socket: $err'));
  }

  /// Rejoint la room spécifique d'un village
  void joinVillage(String villageId) {
    _socket?.emit(SocketEvents.joinVillage, villageId);
  }

  /// Quitte la room du village
  void leaveVillage(String villageId) {
    _socket?.emit('leave-village', villageId);
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}