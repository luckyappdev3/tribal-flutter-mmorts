"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingDefinitionSchema = void 0;
const zod_1 = require("zod");
const resources_schema_1 = require("./resources.schema");
exports.BuildingDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string(), // ex: 'headquarters'
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    maxLevel: zod_1.z.number().int().default(30),
    baseStats: zod_1.z.object({
        baseCost: resources_schema_1.ResourcesSchema,
        baseBuildTime: zod_1.z.number().min(1),
        costMultiplier: zod_1.z.number().min(1).default(1.5),
        timeMultiplier: zod_1.z.number().min(1).default(1.2),
        productionBase: zod_1.z.number().optional(),
        capacityBase: zod_1.z.number().optional(),
        specialMultiplier: zod_1.z.number().optional()
    }),
});
//# sourceMappingURL=building.schema.js.map