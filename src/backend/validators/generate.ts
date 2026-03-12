import { z } from 'zod';

export const speechGenerationSchema = z.object({
  topic: z.string().min(1).max(500),
  occasion: z.enum([
    'council_session',
    'campaign_rally',
    'town_hall',
    'community_event',
    'online_video',
  ]),
  tone: z
    .enum(['formal', 'conversational', 'passionate', 'data_driven'])
    .optional(),
  length: z.union([
    z.enum(['3min', '5min', '10min']),
    z.number().int().min(100).max(5000),
  ]),
  data_level: z.enum(['light', 'medium', 'heavy']).optional(),
  issue_id: z.string().uuid().optional(),
});

export const adGenerationSchema = z.object({
  platform: z.enum([
    'instagram',
    'facebook',
    'x',
    'kakaostory',
    'blog_naver',
  ]),
  topic: z.string().min(1).max(500),
  goal: z.enum([
    'awareness',
    'event_promotion',
    'position_statement',
    'call_to_action',
  ]),
  issue_id: z.string().uuid().optional(),
});
