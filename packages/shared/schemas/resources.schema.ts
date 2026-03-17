import { z } from 'zod';

export const ResourcesSchema = z.object({
  wood:  z.number().min(0),
  stone: z.number().min(0), // ← renommé depuis clay, aligné sur Prisma
  iron:  z.number().min(0),
  food:  z.number().min(0).default(0),
});

export type Resources = z.infer<typeof ResourcesSchema>;
