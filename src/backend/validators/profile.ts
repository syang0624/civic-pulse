import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().max(100),
  district_code: z.string(),
  district_name: z.string(),
  party: z.string(),
  background: z.string().optional(),
  tone: z.enum(['formal', 'conversational', 'passionate', 'data_driven']),
  target_demo: z.array(
    z.enum(['youth', 'elderly', 'families', 'businessOwners', 'workers', 'students']),
  ),
  locale: z.enum(['ko', 'en']),
});

export const positionCreateSchema = z.object({
  topic: z.string(),
  stance: z.string().max(500),
  priority: z.enum(['high', 'medium', 'low']),
  key_number: z.string().optional(),
  talking_points: z.array(z.string()).max(10),
});

export const positionUpdateSchema = positionCreateSchema.partial();
