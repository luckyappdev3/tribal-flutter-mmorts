"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingDefinitionSchema = exports.ResourcesSchema = void 0;
var zod_1 = require("zod");
/**
 * Schéma des ressources de base.
 * Utilisé pour les coûts, les productions et les capacités de stockage.
 */
exports.ResourcesSchema = zod_1.z.object({
    wood: zod_1.z.number().min(0),
    stone: zod_1.z.number().min(0),
    iron: zod_1.z.number().min(0),
    food: zod_1.z.number().min(0).default(0),
});
/**
 * Définition technique d'un bâtiment.
 * Au lieu de lister 30 niveaux, on définit les stats du niveau 1
 * et les multiplicateurs de progression.
 */
exports.BuildingDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string(), // ex: 'headquarters'
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    maxLevel: zod_1.z.number().int().default(30),
    // Configuration de la progression
    baseStats: zod_1.z.object({
        // Coût au niveau 1
        baseCost: exports.ResourcesSchema,
        // Temps de construction au niveau 1 (en secondes)
        baseBuildTime: zod_1.z.number().min(1),
        // Multiplicateurs (ex: 1.5 signifie que le prix augmente de 50% par niveau)
        costMultiplier: zod_1.z.number().min(1).default(1.5),
        timeMultiplier: zod_1.z.number().min(1).default(1.2),
        // Stats optionnelles pour les bâtiments spéciaux (Mines, Entrepôts, Ferme)
        productionBase: zod_1.z.number().optional(), // ex: 30 bois/heure au niv 1
        capacityBase: zod_1.z.number().optional(), // ex: 1000 places au niv 1
        specialMultiplier: zod_1.z.number().optional() // multiplicateur pour prod/capa
    }),
});
