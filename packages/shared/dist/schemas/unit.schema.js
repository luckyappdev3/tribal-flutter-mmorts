"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitDefinitionSchema = exports.UnitCostSchema = void 0;
const zod_1 = require("zod");
exports.UnitCostSchema = zod_1.z.object({
    wood: zod_1.z.number().min(0),
    stone: zod_1.z.number().min(0),
    iron: zod_1.z.number().min(0),
});
exports.UnitDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string(), // ex: 'spearman'
    name: zod_1.z.string(), // ex: 'Lancier'
    description: zod_1.z.string(),
    cost: exports.UnitCostSchema, // Coût de recrutement
    attack: zod_1.z.number().min(0), // Points d'attaque
    defense: zod_1.z.number().min(0), // Points de défense
    speed: zod_1.z.number().min(1), // Secondes par case (plus petit = plus rapide)
    carryCapacity: zod_1.z.number().min(0), // Ressources transportables par unité
    recruitTime: zod_1.z.number().min(1), // Secondes pour recruter 1 unité
});
//# sourceMappingURL=unit.schema.js.map