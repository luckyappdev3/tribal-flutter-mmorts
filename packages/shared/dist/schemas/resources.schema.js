"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcesSchema = void 0;
const zod_1 = require("zod");
exports.ResourcesSchema = zod_1.z.object({
    wood: zod_1.z.number().min(0),
    stone: zod_1.z.number().min(0),
    iron: zod_1.z.number().min(0),
    food: zod_1.z.number().min(0).default(0),
});
//# sourceMappingURL=resources.schema.js.map