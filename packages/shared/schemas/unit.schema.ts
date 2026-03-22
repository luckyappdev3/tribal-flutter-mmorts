import { z } from 'zod';

export const UnitCostSchema = z.object({
  wood:  z.number().min(0),
  stone: z.number().min(0),
  iron:  z.number().min(0),
});

export const UnitDefinitionSchema = z.object({
  id:           z.string(),
  name:         z.string(),
  description:  z.string(),
  cost:         UnitCostSchema,
  attack:       z.number().min(0),
  defense:      z.number().min(0),
  speed:        z.number().min(1),
  carryCapacity: z.number().min(0),
  recruitTime:  z.number().min(1),
  populationCost:    z.number().min(0).default(1),       // ← NOUVEAU
  requiredBuilding:  z.string().nullable().default(null), // ← NOUVEAU (ex: 'stable')
});

export type UnitDefinition = z.infer<typeof UnitDefinitionSchema>;

// Groupe d'unités pour les calculs de combat
export type UnitGroup = {
  unitType: string;
  count:    number;
  attack:   number;
  defense:  number;
  carryCapacity: number;
};
