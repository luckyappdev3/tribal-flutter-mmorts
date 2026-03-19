import { io } from './socket.server';

export const broadcastDelta = (villageId: string, patch: any) => {
  try {
    io.to(`village:${villageId}`).emit('resources:update', patch);
  } catch (e) {
    // Socket pas encore prêt — non bloquant
  }
};