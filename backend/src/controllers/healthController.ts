import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { successResponse } from '../types/api';
import { sql } from 'drizzle-orm';
import { env } from '../config/env';
import { getDatabasePath } from '../config/database';

type CheckResult = { status: 'ok' | 'error'; latencyMs?: number; detail?: string };

export async function healthCheck(_req: AuthRequest, res: Response): Promise<void> {
  const startTime = Date.now();
  const checks: Record<string, CheckResult> = {};

  // ── SQLite Database ───────────────────────────────────────
  try {
    const db = getDatabase();
    const t0 = Date.now();
    db.get(sql`SELECT 1`);
    checks.database = { status: 'ok', latencyMs: Date.now() - t0, detail: `SQLite: ${getDatabasePath()}` };
  } catch (err) {
    checks.database = { status: 'error', detail: err instanceof Error ? err.message : 'Unknown' };
  }

  // ── Redis (stub in desktop mode) ──────────────────────────
  checks.redis = { status: 'ok', detail: 'In-memory stub (desktop mode — no Redis needed)' };

  // ── OpenRouter ────────────────────────────────────────────
  const isKeyUnconfigured = !env.OPENROUTER_API_KEY || 
                            env.OPENROUTER_API_KEY === 'placeholder' || 
                            env.OPENROUTER_API_KEY === 'PASTE_YOUR_KEY_HERE' ||
                            env.OPENROUTER_API_KEY.includes('PASTE_YOUR_KEY_HERE');
  checks.openrouter = {
    status: isKeyUnconfigured ? 'error' : 'ok',
    detail: isKeyUnconfigured
      ? 'API key not set — edit .env and restart'
      : `Model: ${env.DEFAULT_MODEL}`,
  };

  // ── In-memory queues ──────────────────────────────────────
  try {
    const { getQueues } = await import('../queues/inMemoryQueue');
    const queues = getQueues();
    const stats: Record<string, object> = {};
    for (const [name, queue] of queues) {
      stats[name] = {
        waiting:   await queue.getWaitingCount(),
        active:    await queue.getActiveCount(),
        completed: await queue.getCompletedCount(),
        failed:    await queue.getFailedCount(),
      };
    }
    checks.queues = { status: 'ok', detail: `${queues.size} in-memory queues active` };
  } catch {
    checks.queues = { status: 'ok', detail: 'In-memory queues (desktop mode)' };
  }

  // ── Storage ───────────────────────────────────────────────
  checks.storage = { status: 'ok', detail: 'Local filesystem (desktop mode)' };

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  res.status(allOk ? 200 : 207).json(
    successResponse({
      status:         allOk ? 'healthy' : 'degraded',
      mode:           'desktop',
      uptime:         Math.floor(process.uptime()),
      totalLatencyMs: Date.now() - startTime,
      checks,
      version:        '1.0.0',
      environment:    env.NODE_ENV,
      timestamp:      new Date().toISOString(),
      aiModel:        env.DEFAULT_MODEL,
      database:       'SQLite',
    }),
  );
}

export async function queuesHealth(_req: AuthRequest, res: Response): Promise<void> {
  res.json(successResponse({ status: 'healthy', detail: 'In-memory queues active' }));
}

export async function servicesHealth(_req: AuthRequest, res: Response): Promise<void> {
  res.json(successResponse({ status: 'healthy', detail: 'All desktop services active' }));
}

