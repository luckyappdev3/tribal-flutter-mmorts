import { z } from 'zod';
export declare const ResourcesSchema: z.ZodObject<{
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
export type Resources = z.infer<typeof ResourcesSchema>;
//# sourceMappingURL=resources.schema.d.ts.map