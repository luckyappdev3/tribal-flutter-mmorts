import { z } from 'zod';

export const UnitCostSchema = z.object({
  wood:  z.number().min(0),
  stone: z.number().min(0),
  iron:  z.number().min(0),
});

// Catégorie de combat pour la pondération de la défense
export const UnitCategorySchema = z.enum(['infantry', 'cavalry', 'archer', 'siege', 'hero', 'conquest']);
export type UnitCategory = z.infer<typeof UnitCategorySchema>;

export const UnitDefinitionSchema = z.object({
  id:              z.string(),
  name:            z.string(),
  description:     z.string(),
  category:        UnitCategorySchema,
  order:           z.number().int().default(99),
  cost:            UnitCostSchema,
  attack:          z.number().min(0),
  defenseGeneral:  z.number().min(0),   // défense contre infanterie/siège
  defenseCavalry:  z.number().min(0),   // défense contre cavalerie
  defenseArcher:   z.number().min(0),   // défense contre archers
  speed:           z.number().min(1),   // secondes par case (plus petit = plus rapide)
  carryCapacity:   z.number().min(0),
  recruitTime:     z.number().min(1),   // secondes par unité
  populationCost:  z.number().min(0).default(1),
  requiredBuildings: z.array(
    z.object({ buildingId: z.string(), level: z.number().int().min(1) })
  ).default([]),
});

export type UnitDefinition = z.infer<typeof UnitDefinitionSchema>;

// Groupe d'unités pour les calculs de combat
export type UnitGroup = {
  unitType:       string;
  count:          number;
  attack:         number;
  defenseGeneral: number;
  defenseCavalry: number;
  defenseArcher:  number;
  carryCapacity:  number;
  category:       UnitCategory;
};
