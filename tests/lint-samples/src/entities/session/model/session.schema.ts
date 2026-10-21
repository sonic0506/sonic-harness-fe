import { z } from 'zod';

const sessionSchema = z.object({ userId: z.string() });

export type Session = z.infer<typeof sessionSchema>;

export const parseSession = (value: unknown): Session =>
  sessionSchema.parse(value);
