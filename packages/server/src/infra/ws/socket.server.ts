import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';

export let io: Server;

export const initSocketServer = (fastify: FastifyInstance) => {
  io = new Server(fastify.server, {
    cors: { origin: '*' }
  });
  
  io.on('connection', (socket) => {
    console.log('📱 New client connected:', socket.id);
    
    socket.on('join-village', (villageId) => {
      socket.join(`village:${villageId}`);
      console.log(`🏠 Client ${socket.id} joined village:${villageId}`);
    });
  });
};