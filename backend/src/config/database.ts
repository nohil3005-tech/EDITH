/**
 * EDITH Desktop — SQLite Database Client
 * Replaces PostgreSQL with better-sqlite3 via Drizzle ORM.
 * Database file lives in %APPDATA%/EDITH/edith.db on Windows.
 */

import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as schema from '../db/schema';
import { logger } from '../utils/logger';

// ─── Resolve database path ────────────────────────────────────
function getDbPath(): string {
  // Use env override first (useful for dev/testing)
  if (process.env.SQLITE_PATH) {
    return process.env.SQLITE_PATH;
  }

  // In production Electron app, store in AppData
  const appData =
    process.env.APPDATA ||                                      // Windows
    (process.platform === 'darwin'
      ? join(process.env.HOME!, 'Library', 'Application Support') // macOS
      : join(process.env.HOME!, '.config'));                      // Linux

  const edithDir = join(appData, 'EDITH');
  if (!existsSync(edithDir)) {
    mkdirSync(edithDir, { recursive: true });
  }

  return join(edithDir, 'edith.db');
}

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: Database.Database | null = null;

export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    const dbPath = getDbPath();
    logger.info({ dbPath }, '📂 Opening SQLite database');

    _sqlite = new Database(dbPath, {
      timeout: 5000,
      // WAL mode = better concurrent read performance
      // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });

    // Enable WAL mode and performance pragmas
    _sqlite.pragma('journal_mode = WAL');
    _sqlite.pragma('synchronous = NORMAL');
    _sqlite.pragma('foreign_keys = ON');
    _sqlite.pragma('cache_size = -64000'); // 64MB cache
    _sqlite.pragma('temp_store = MEMORY');

    _db = drizzle(_sqlite, { schema, logger: false });
    logger.info({ dbPath }, '✅ SQLite database ready');
  }
  return _db;
}

export function closeDatabase(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
    logger.info('SQLite database closed');
  }
}

export function getDatabasePath(): string {
  return getDbPath();
}

export type Database2 = BetterSQLite3Database<typeof schema>;
