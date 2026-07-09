/**
 * EDITH — PostgreSQL Database Client
 * Replaces SQLite with postgres-js via Drizzle ORM.
 * Connects to Neon PostgreSQL using DATABASE_URL environment variable.
 */

import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { logger } from '../utils/logger';

let _db: PostgresJsDatabase<typeof schema> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export function getDatabase(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is missing.');
    }

    logger.info('📂 Connecting to PostgreSQL database');

    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('postgres');
    _client = postgres(connectionString, {
      max: 10,
      ssl: isLocal ? false : { rejectUnauthorized: false }, // Required for secure cloud DB connections
      prepare: false, // Required for Neon serverless / pool connections
    });

    _db = drizzle(_client, { schema });
    logger.info('✅ PostgreSQL connection pool initialized');
  }
  return _db;
}

export function closeDatabase(): void {
  if (_client) {
    _client.end();
    _client = null;
    _db = null;
    logger.info('PostgreSQL connection pool closed');
  }
}

export function getDatabasePath(): string {
  return 'postgres';
}

export type Database2 = PostgresJsDatabase<typeof schema>;
