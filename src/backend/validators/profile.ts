import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  district_code: z.string().optional(),
  district_name: z.string().optional(),
  election_type: z
    .enum([
      'metropolitan_mayor',
      'metropolitan_council',
      'local_mayor',
      'local_council',
      'superintendent',
    ])
    .optional(),
  party: z.string().optional(),
  background: z.string().optional(),
  tone: z.enum(['formal', 'conversational', 'passionate', 'data_driven']).optional(),
  target_demo: z.array(
    z.enum(['youth', 'elderly', 'families', 'businessOwners', 'workers', 'students']),
  ).optional(),
  locale: z.enum(['ko', 'en']).optional(),
});

export const positionCreateSchema = z.object({
  topic: z.string(),
  stance: z.string().max(500),
  priority: z.enum(['high', 'medium', 'low']),
  key_number: z.string().optional(),
  talking_points: z.array(z.string()).max(10),
});

export const positionUpdateSchema = positionCreateSchema.partial();
