import { z } from 'zod';

const schema = z.object({
  API_BASE_URL: z.string().default('/api'),
});

export const env = schema.parse({ API_BASE_URL: process.env.API_BASE_URL });
