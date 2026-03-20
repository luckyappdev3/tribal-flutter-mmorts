import 'dart:async';

/// Service singleton qui émet l'index de l'onglet actif à chaque changement.
/// Chaque BLoC/page s'y abonne pour se rafraîchir automatiquement.
class TabRefreshService {
  TabRefreshService._();
  static final TabRefreshService instance = TabRefreshService._();

  final _controller = StreamController<int>.broadcast();

  Stream<int> get stream => _controller.stream;

  void notifyTabSelected(int index) => _controller.add(index);

  void dispose() => _controller.close();
}

/// Index des onglets — à garder en sync avec app_router.dart
class TabIndex {
  static const int village      = 0;
  static const int construction = 1;
  static const int map          = 2;
  static const int troops       = 3;
  static const int movements    = 4;
  static const int reports      = 5;
  static const int ranking      = 6;
}
