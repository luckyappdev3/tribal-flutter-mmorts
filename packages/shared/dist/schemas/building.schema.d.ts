import { z } from 'zod';
export declare const BuildingDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    maxLevel: z.ZodDefault<z.ZodNumber>;
    baseStats: z.ZodObject<{
        baseCost: z.ZodObject<{
            wood: z.ZodNumber;
            stone: z.ZodNumber;
            iron: z.ZodNumber;
            food: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            wood: number;
            stone: number;
            iron: number;
            food: number;
        }, {
            wood: number;
            stone: number;
            iron: number;
            food?: number | undefined;
        }>;
        baseBuildTime: z.ZodNumber;
        costMultiplier: z.ZodDefault<z.ZodNumber>;
        timeMultiplier: z.ZodDefault<z.ZodNumber>;
        productionBase: z.ZodOptional<z.ZodNumber>;
        capacityBase: z.ZodOptional<z.ZodNumber>;
        specialMultiplier: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        baseCost: {
            wood: number;
            stone: number;
            iron: number;
            food: number;
        };
        baseBuildTime: number;
        costMultiplier: number;
        timeMultiplier: number;
        productionBase?: number | undefined;
        capacityBase?: number | undefined;
        specialMultiplier?: number | undefined;
    }, {
        baseCost: {
            wood: number;
            stone: number;
            iron: number;
            food?: number | undefined;
        };
        baseBuildTime: number;
        costMultiplier?: number | undefined;
        timeMultiplier?: number | undefined;
        productionBase?: number | undefined;
        capacityBase?: number | undefined;
        specialMultiplier?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    maxLevel: number;
    baseStats: {
        baseCost: {
            wood: number;
            stone: number;
            iron: number;
            food: number;
        };
        baseBuildTime: number;
        costMultiplier: number;
        timeMultiplier: number;
        productionBase?: number | undefined;
        capacityBase?: number | undefined;
        specialMultiplier?: number | undefined;
    };
}, {
    id: string;
    name: string;
    description: string;
    baseStats: {
        baseCost: {
            wood: number;
            stone: number;
            iron: number;
            food?: number | undefined;
        };
        baseBuildTime: number;
        costMultiplier?: number | undefined;
        timeMultiplier?: number | undefined;
        productionBase?: number | undefined;
        capacityBase?: number | undefined;
        specialMultiplier?: number | undefined;
    };
    maxLevel?: number | undefined;
}>;
export type BuildingDefinition = z.infer<typeof BuildingDefinitionSchema>;
//# sourceMappingURL=building.schema.d.ts.map