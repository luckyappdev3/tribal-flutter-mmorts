import { z } from 'zod';
export declare const UnitCostSchema: z.ZodObject<{
    wood: z.ZodNumber;
    stone: z.ZodNumber;
    iron: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    wood: number;
    stone: number;
    iron: number;
}, {
    wood: number;
    stone: number;
    iron: number;
}>;
export declare const UnitDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    cost: z.ZodObject<{
        wood: z.ZodNumber;
        stone: z.ZodNumber;
        iron: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        wood: number;
        stone: number;
        iron: number;
    }, {
        wood: number;
        stone: number;
        iron: number;
    }>;
    attack: z.ZodNumber;
    defense: z.ZodNumber;
    speed: z.ZodNumber;
    carryCapacity: z.ZodNumber;
    recruitTime: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    cost: {
        wood: number;
        stone: number;
        iron: number;
    };
    attack: number;
    defense: number;
    speed: number;
    carryCapacity: number;
    recruitTime: number;
}, {
    id: string;
    name: string;
    description: string;
    cost: {
        wood: number;
        stone: number;
        iron: number;
    };
    attack: number;
    defense: number;
    speed: number;
    carryCapacity: number;
    recruitTime: number;
}>;
export type UnitDefinition = z.infer<typeof UnitDefinitionSchema>;
export type UnitGroup = {
    unitType: string;
    count: number;
    attack: number;
    defense: number;
    carryCapacity: number;
};
//# sourceMappingURL=unit.schema.d.ts.map