/**
 * EDITH Desktop — Redis Stub
 * Redis is not available in the desktop app.
 * This module provides a no-op stub so existing imports don't break.
 * All BullMQ queue functionality is replaced by direct async calls.
 */

import { logger } from '../utils/logger';

// ─── Minimal Redis-compatible stub ───────────────────────────
class RedisStub {
  private store = new Map<string, string>();

  async ping(): Promise<string> { return 'PONG'; }
  async get(key: string): Promise<string | null> { return this.store.get(key) ?? null; }
  async set(key: string, value: string): Promise<'OK'> { this.store.set(key, value); return 'OK'; }
  async del(key: string): Promise<number> { return this.store.delete(key) ? 1 : 0; }
  async quit(): Promise<'OK'> { return 'OK'; }
  on(_event: string, _handler: unknown): this { return this; }
}

let _stub: RedisStub | null = null;

export function getRedis(): RedisStub {
  if (!_stub) {
    _stub = new RedisStub();
    logger.info('📦 Redis stub active (desktop mode — no external Redis needed)');
  }
  return _stub;
}

export function createRedisConnection(): RedisStub {
  return new RedisStub();
}

export async function closeRedis(): Promise<void> {
  _stub = null;
}

export type { RedisStub as Redis };
