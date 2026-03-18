import { z } from 'zod';

export const UnitCostSchema = z.object({
  wood:  z.number().min(0),
  stone: z.number().min(0),
  iron:  z.number().min(0),
});

export const UnitDefinitionSchema = z.object({
  id:           z.string(),           // ex: 'spearman'
  name:         z.string(),           // ex: 'Lancier'
  description:  z.string(),
  cost:         UnitCostSchema,       // Coût de recrutement
  attack:       z.number().min(0),    // Points d'attaque
  defense:      z.number().min(0),    // Points de défense
  speed:        z.number().min(1),    // Secondes par case (plus petit = plus rapide)
  carryCapacity: z.number().min(0),   // Ressources transportables par unité
  recruitTime:  z.number().min(1),    // Secondes pour recruter 1 unité
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
