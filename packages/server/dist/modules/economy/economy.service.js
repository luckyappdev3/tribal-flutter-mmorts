"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomyService = void 0;
const prisma_client_1 = require("../../infra/db/prisma.client");
const shared_1 = require("@mmorts/shared");
class EconomyService {
    async processVillageTick(villageId) {
        // 1. Récupération du village avec les nouveaux champs de ton schéma
        const village = await prisma_client_1.prisma.village.findUnique({
            where: { id: villageId }
        });
        if (!village)
            return null;
        const now = new Date();
        // 2. Calcul du temps écoulé depuis le dernier tick
        // On force la conversion en Date au cas où Prisma renverrait un string ISO
        const lastTickDate = new Date(village.lastTick);
        const elapsedMs = now.getTime() - lastTickDate.getTime();
        // On évite les calculs inutiles si le laps de temps est trop court (ex: < 1ms)
        if (elapsedMs <= 0)
            return village;
        // 3. Calcul des gains via les formules du package shared
        // On passe le niveau du camp de bois (timberCampLevel) et le temps écoulé
        const woodGain = (0, shared_1.calcResourceProduction)(village.timberCampLevel, elapsedMs);
        const stoneGain = (0, shared_1.calcResourceProduction)(village.quarryLevel, elapsedMs);
        const ironGain = (0, shared_1.calcResourceProduction)(village.ironMineLevel, elapsedMs);
        // Note : Tu pourras ajouter ici stoneGain, ironGain etc. avec leurs niveaux respectifs
        // const stoneGain = calcResourceProduction(village.quarryLevel, elapsedMs);
        // 4. Mise à jour atomique en base de données
        return await prisma_client_1.prisma.village.update({
            where: { id: villageId },
            data: {
                wood: { increment: woodGain },
                stone: { increment: stoneGain }, // ← manquait
                iron: { increment: ironGain }, // ← manquait
                // On pourrait aussi incrémenter stone: { increment: stoneGain } ici
                lastTick: now, // On met à jour le timestamp pour le prochain calcul
            }
        });
    }
}
exports.EconomyService = EconomyService;
