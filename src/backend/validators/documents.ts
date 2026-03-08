import { z } from 'zod';

export const documentSummarizeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(100).max(100_000),
});
