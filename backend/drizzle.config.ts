import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is not set. Drizzle-kit may fail if connecting to live database.');
}

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/edith',
  },
  verbose: false,
  strict: false,
} satisfies Config;
