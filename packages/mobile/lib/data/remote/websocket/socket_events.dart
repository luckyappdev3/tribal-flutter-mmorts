class SocketEvents {
  // Événements sortants (Client -> Serveur)
  static const String joinVillage = 'join-village';
  
  // Événements entrants (Serveur -> Client)
  // MODIFICATION ICI : On remplace le tiret par les deux points
  static const String resourcesUpdate = 'resources:update'; 
  
  static const String buildComplete = 'build-complete';
  static const String attackIncoming = 'attack-incoming';
}