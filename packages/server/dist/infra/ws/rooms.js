"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastDelta = void 0;
const socket_server_1 = require("./socket.server");
const broadcastDelta = (villageId, patch) => {
    try {
        socket_server_1.io.to(`village:${villageId}`).emit('resources:update', patch);
    }
    catch (e) {
        // Socket pas encore prêt — non bloquant
    }
};
exports.broadcastDelta = broadcastDelta;
