import { z } from 'zod';
import { ResourcesSchema } from './resources.schema';

export const VillageSharedSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(20),
  x: z.number().int(),
  y: z.number().int(),
  
  // Économie
  resources: ResourcesSchema,
  storageMax: z.number().int().nonnegative(),
  
  // Population (Tribal Wars Style)
  popUsed: z.number().int().nonnegative(), // Somme (niveaux bâtiments + troupes)
  popMax: z.number().int().nonnegative(),  // Capacité fournie par la Ferme
  
  lastUpdate: z.string(), // ISO Date pour le calcul de production "offline"
});

export type VillageShared = z.infer<typeof VillageSharedSchema>;