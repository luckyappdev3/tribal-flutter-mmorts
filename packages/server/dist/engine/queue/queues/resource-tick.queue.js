"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGlobalResourceTick = exports.resourceTickQueue = void 0;
const bullmq_1 = require("bullmq");
// Configuration de la connexion Redis (doit être identique à celle du worker)
const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};
// 1. Définition de la Queue BullMQ
exports.resourceTickQueue = new bullmq_1.Queue('resource-tick', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: true, // Nettoie Redis après exécution
        attempts: 1,
    }
});
// 2. Fonction pour lancer la boucle de production
const startGlobalResourceTick = async () => {
    console.log('📡 Configuration du tick global des ressources...');
    // Supprime les anciens jobs répétables pour éviter les doublons au redémarrage
    const repeatableJobs = await exports.resourceTickQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await exports.resourceTickQueue.removeRepeatableByKey(job.key);
    }
    // Ajoute un job qui s'exécute toutes les 10 secondes
    await exports.resourceTickQueue.add('global-resource-tick', { mode: 'all' }, // On peut passer des données ici si besoin
    {
        repeat: { every: 10000 }, // 10000ms = 10s
        jobId: 'global-tick'
    });
};
exports.startGlobalResourceTick = startGlobalResourceTick;
