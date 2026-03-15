import { z } from 'zod';
export declare const VillageSharedSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    resources: z.ZodObject<{
        wood: z.ZodNumber;
        clay: z.ZodNumber;
        iron: z.ZodNumber;
        food: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        wood: number;
        clay: number;
        iron: number;
        food: number;
    }, {
        wood: number;
        clay: number;
        iron: number;
        food?: number | undefined;
    }>;
    storageMax: z.ZodNumber;
    popUsed: z.ZodNumber;
    popMax: z.ZodNumber;
    lastUpdate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    x: number;
    y: number;
    resources: {
        wood: number;
        clay: number;
        iron: number;
        food: number;
    };
    storageMax: number;
    popUsed: number;
    popMax: number;
    lastUpdate: string;
}, {
    id: string;
    name: string;
    x: number;
    y: number;
    resources: {
        wood: number;
        clay: number;
        iron: number;
        food?: number | undefined;
    };
    storageMax: number;
    popUsed: number;
    popMax: number;
    lastUpdate: string;
}>;
export type VillageShared = z.infer<typeof VillageSharedSchema>;
//# sourceMappingURL=village.schema.d.ts.map