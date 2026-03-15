import { PrismaClient } from '@prisma/client';

// On déclare l'instance globale
export const prisma = new PrismaClient();

// Optionnel : Log des requêtes en développement
/*
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
*/