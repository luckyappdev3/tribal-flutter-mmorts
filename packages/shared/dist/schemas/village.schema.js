"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VillageSharedSchema = void 0;
const zod_1 = require("zod");
const resources_schema_1 = require("./resources.schema");
exports.VillageSharedSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(3).max(20),
    x: zod_1.z.number().int(),
    y: zod_1.z.number().int(),
    // Économie
    resources: resources_schema_1.ResourcesSchema,
    storageMax: zod_1.z.number().int().nonnegative(),
    // Population (Tribal Wars Style)
    popUsed: zod_1.z.number().int().nonnegative(), // Somme (niveaux bâtiments + troupes)
    popMax: zod_1.z.number().int().nonnegative(), // Capacité fournie par la Ferme
    lastUpdate: zod_1.z.string(), // ISO Date pour le calcul de production "offline"
});
//# sourceMappingURL=village.schema.js.map