/**
 * EDITH Desktop — Environment Configuration
 * Reads from .env file. SQLite replaces DATABASE_URL.
 * Redis/BullMQ variables are ignored (not needed in desktop mode).
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// Try multiple .env locations — works both in dev and packaged Electron
const envLocations = [
  join(process.cwd(), '.env'),
  join(__dirname, '..', '..', '.env'),
  join(__dirname, '..', '..', '..', '.env'),
  join(process.execPath, '..', '.env'),
];

for (const loc of envLocations) {
  if (existsSync(loc)) {
    dotenv.config({ path: loc });
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(3001),
  API_KEY: z.string().min(1).default('edith-desktop-key'),

  // SQLite path (optional — defaults to %APPDATA%/EDITH/edith.db)
  SQLITE_PATH: z.string().optional(),

  // OpenRouter — REQUIRED for AI features
  OPENROUTER_API_KEY: z.string().default('placeholder'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  DEFAULT_MODEL: z.string().default('deepseek/deepseek-chat'),
  FALLBACK_MODEL: z.string().default('openai/gpt-4o-mini'),

  // Ollama — Local offline AI models
  OLLAMA_BASE_URL: z.string().url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('deepseek-r1'),

  // Payments (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Email (optional)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('EDITH <noreply@edith.local>'),
  EMAIL_REPLY_TO: z.string().optional(),

  // Storage: local only in desktop mode
  STORAGE_PROVIDER: z.enum(['local']).default('local'),

  // App
  FRONTEND_URL: z.string().default('http://localhost:3001'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(50),
  DEFAULT_CURRENCY: z.string().default('USD'),
  DEFAULT_LANGUAGE: z.string().default('en'),

  // Desktop-specific
  JOB_SCAN_INTERVAL_HOURS: z.coerce.number().default(4),
  AD_OPTIMIZATION_INTERVAL_HOURS: z.coerce.number().default(6),

  // Auth & Gates
  GOOGLE_CLIENT_ID: z.string().optional(),
  GATE2_CODENAME: z.string().optional(),
  JWT_SECRET: z.string().default('edith-jwt-secret-key'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // In desktop mode, warn but never crash on missing env
  console.warn('⚠️  Some environment variables are missing:', parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : envSchema.parse({});
