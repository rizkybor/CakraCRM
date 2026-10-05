import { z } from 'zod';

// Load backend/.env in local development (Render injects env vars directly).
try {
  process.loadEnvFile();
} catch {
  // No .env file - rely on the real environment.
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CLIENT_URL: z.string().min(1, 'CLIENT_URL is required'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  COOKIE_DOMAIN: z.string().optional(),
  BOOTSTRAP_ADMIN_NAME: z.string().default('Administrator'),
  BOOTSTRAP_ADMIN_EMAIL: z.email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).optional(),
});

const parsed = envSchema.safeParse(
  // Treat empty strings as "not set" so optional vars from dashboards behave.
  Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')),
);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  isProduction: data.NODE_ENV === 'production',
  JWT_REFRESH_SECRET: data.JWT_REFRESH_SECRET ?? data.JWT_SECRET,
  allowedOrigins: data.CLIENT_URL.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
};
