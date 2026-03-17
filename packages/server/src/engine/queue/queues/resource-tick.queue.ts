import { Queue } from 'bullmq';

// Configuration de la connexion Redis (doit être identique à celle du worker)
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// 1. Définition de la Queue BullMQ
export const resourceTickQueue = new Queue('resource-tick', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true, // Nettoie Redis après exécution
    attempts: 1,
  }
});

// 2. Fonction pour lancer la boucle de production
export const startGlobalResourceTick = async () => {
  console.log('📡 Configuration du tick global des ressources...');
  
  // Supprime les anciens jobs répétables pour éviter les doublons au redémarrage
  const repeatableJobs = await resourceTickQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await resourceTickQueue.removeRepeatableByKey(job.key);
  }

  // Ajoute un job qui s'exécute toutes les 10 secondes
  await resourceTickQueue.add(
    'global-resource-tick', 
    { mode: 'all' }, // On peut passer des données ici si besoin
    { 
      repeat: { every: 1000 }, // 10000ms = 10s
      jobId: 'global-tick' 
    }
  );
};