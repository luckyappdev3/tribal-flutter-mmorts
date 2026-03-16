"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = exports.io = void 0;
const socket_io_1 = require("socket.io");
const initSocketServer = (fastify) => {
    exports.io = new socket_io_1.Server(fastify.server, {
        cors: { origin: '*' }
    });
    exports.io.on('connection', (socket) => {
        console.log('📱 New client connected:', socket.id);
        socket.on('join-village', (villageId) => {
            socket.join(`village:${villageId}`);
            console.log(`🏠 Client ${socket.id} joined village:${villageId}`);
        });
    });
};
exports.initSocketServer = initSocketServer;
