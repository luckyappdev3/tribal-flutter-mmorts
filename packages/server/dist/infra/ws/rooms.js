"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastDelta = void 0;
const socket_server_1 = require("./socket.server");
const broadcastDelta = (villageId, patch) => {
    // Envoie uniquement aux joueurs connectés dans la room du village [cite: 88]
    socket_server_1.io.to(`village:${villageId}`).emit('resources:update', patch);
};
exports.broadcastDelta = broadcastDelta;
