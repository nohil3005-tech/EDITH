import type { Config } from 'drizzle-kit';
import { join } from 'path';

const appData = process.env.APPDATA ||
  (process.platform === 'darwin'
    ? join(process.env.HOME!, 'Library', 'Application Support')
    : join(process.env.HOME!, '.config'));

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_PATH ?? join(appData, 'EDITH', 'edith.db'),
  },
  verbose: false,
  strict: false,
} satisfies Config;
