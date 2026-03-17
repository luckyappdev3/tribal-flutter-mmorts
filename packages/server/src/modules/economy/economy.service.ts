import { prisma } from '../../infra/db/prisma.client';
import { calcResourceProduction } from '@mmorts/shared';

export class EconomyService {
  async processVillageTick(villageId: string) {
    // 1. Récupération du village avec les nouveaux champs de ton schéma
    const village = await prisma.village.findUnique({ 
      where: { id: villageId } 
    });

    if (!village) return null;

    const now = new Date();
    
    // 2. Calcul du temps écoulé depuis le dernier tick
    // On force la conversion en Date au cas où Prisma renverrait un string ISO
    const lastTickDate = new Date(village.lastTick);
    const elapsedMs = now.getTime() - lastTickDate.getTime();

    // On évite les calculs inutiles si le laps de temps est trop court (ex: < 1ms)
    if (elapsedMs <= 0) return village;

    // 3. Calcul des gains via les formules du package shared
    // On passe le niveau du camp de bois (timberCampLevel) et le temps écoulé
    const woodGain = calcResourceProduction(village.timberCampLevel, elapsedMs);
    const stoneGain = calcResourceProduction(village.quarryLevel,    elapsedMs);
    const ironGain  = calcResourceProduction(village.ironMineLevel,  elapsedMs);

    
    // Note : Tu pourras ajouter ici stoneGain, ironGain etc. avec leurs niveaux respectifs
    // const stoneGain = calcResourceProduction(village.quarryLevel, elapsedMs);

    // 4. Mise à jour atomique en base de données
    return await prisma.village.update({
      where: { id: villageId },
      data: {
        wood: { increment: woodGain },
        stone:    { increment: stoneGain }, // ← manquait
        iron:     { increment: ironGain },  // ← manquait
        // On pourrait aussi incrémenter stone: { increment: stoneGain } ici
        lastTick: now, // On met à jour le timestamp pour le prochain calcul
      }
    });
  }
}