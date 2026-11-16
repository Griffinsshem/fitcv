import { z } from 'zod';

/**
 * All configuration is read and validated once at boot. The process refuses
 * to start with invalid config rather than failing later at request time.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().url(),
  DATABASE_URL_DIRECT: z.string().url().optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),

  WEB_ORIGIN: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean),
    ),

  GOOGLE_CLIENT_ID: z.string().min(10),

  AI_PROVIDER: z.enum(['anthropic', 'gemini']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5-5'),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(120000),
  AI_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  AI_DAILY_LIMIT: z.coerce.number().int().min(0).default(30),

  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(2),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  MAX_APPLICATIONS_PER_USER: z.coerce.number().int().min(1).default(500),
});

export type Env = z.infer<typeof EnvSchema>;

function load(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // Never print values — only which keys are wrong.
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = load();
export const isProd = env.NODE_ENV === 'production';
