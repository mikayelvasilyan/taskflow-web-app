import { z } from 'zod';

const bool = (def: boolean) =>
  z
    .enum(['true', 'false'])
    .default(def ? 'true' : 'false')
    .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default('file:./data/taskflow.db'),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: bool(false),
  SEED_ON_START: bool(true),
  DEMO_RESET_INTERVAL_MINUTES: z.coerce.number().int().min(0).default(0),
  SERVE_WEB_DIR: z.string().optional(),
});

export type Env = Omit<z.infer<typeof schema>, 'JWT_SECRET'> & { JWT_SECRET: string };

export const INSECURE_DEV_SECRET = 'insecure-dev-secret-do-not-use-in-production';

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.parse(source);
  if (parsed.NODE_ENV === 'production' && !parsed.JWT_SECRET) {
    throw new Error('JWT_SECRET is required when NODE_ENV=production');
  }
  return { ...parsed, JWT_SECRET: parsed.JWT_SECRET ?? INSECURE_DEV_SECRET };
}
