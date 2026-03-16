"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// On déclare l'instance globale
exports.prisma = new client_1.PrismaClient();
// Optionnel : Log des requêtes en développement
/*
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
*/ 
