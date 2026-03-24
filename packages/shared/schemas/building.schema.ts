import { z } from 'zod';
import { ResourcesSchema } from './resources.schema';

export const BuildingDefinitionSchema = z.object({
  id: z.string(), // ex: 'headquarters'
  name: z.string(),
  description: z.string(),
  maxLevel: z.number().int().default(30),
  order: z.number().int().default(99), // ordre d'affichage dans l'UI
  prerequisites: z.record(z.string(), z.number()).optional(), // buildingId → niveau requis

  baseStats: z.object({
    baseCost: ResourcesSchema,
    baseBuildTime: z.number().min(1),
    costMultiplier: z.number().min(1).default(1.5),
    timeMultiplier: z.number().min(1).default(1.2),
    productionBase: z.number().optional(),
    capacityBase: z.number().optional(),
    specialMultiplier: z.number().optional()
  }),
});

export type BuildingDefinition = z.infer<typeof BuildingDefinitionSchema>;