import { io } from './socket.server';

export const broadcastDelta = (villageId: string, patch: any) => {
  // Envoie uniquement aux joueurs connectés dans la room du village [cite: 88]
  io.to(`village:${villageId}`).emit('resources:update', patch);
};