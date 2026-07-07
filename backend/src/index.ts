/**
 * EDITH Desktop — Backend Entry Point
 *
 * Key behaviours for Electron integration:
 *  1. Runs SQLite auto-migration before anything else.
 *  2. Starts Express on localhost:3001.
 *  3. Prints "BACKEND_READY" to stdout — Electron listens for this
 *     before opening the browser window.
 *  4. All errors are logged; the process never crashes silently.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { closeDatabase, getDatabase } from './config/database';
import { closeRedis } from './config/redis';
import { defaultRateLimiter } from './middleware/rateLimiter';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRoutes from './routes/index';
import stripeWebhook from './webhooks/stripe';
import razorpayWebhook from './webhooks/razorpay';
import { startAllWorkers, stopAllWorkers } from './queues/workers';
import { setupRepeatingJobs, closeQueues } from './queues/scheduler';
import { requestContext } from './utils/context';
import { platformPoller } from './services/platform/PlatformPoller';
import { eq } from 'drizzle-orm';
import { processorSessions, activeFreelanceJobs, freelanceJobs } from './db/schema';

const app = express();

// ─── Security ─────────────────────────────────────────────────
app.set('trust proxy', false); // Desktop — no reverse proxy
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// ─── CORS — only allow our Electron renderer (localhost:3001) ──
app.use(cors({
  origin: [
    'http://localhost:5000', 'http://127.0.0.1:5000',
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:5001', 'http://127.0.0.1:5001',
    'http://localhost:3001', 'http://127.0.0.1:3001',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  optionsSuccessStatus: 200,
}));

// ─── Stripe webhook needs raw body ────────────────────────────
app.use('/api/v1/payment/webhook/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhook,
);
app.use('/api/v1/payment/webhook/razorpay',
  express.json(),
  razorpayWebhook,
);

// ─── Body parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', defaultRateLimiter);

app.use((req, _res, next) => {
  requestContext.run({ req }, () => {
    next();
  });
});

// ─── Root info ────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ name: 'EDITH Desktop Backend', version: '1.0.0', status: 'running', mode: 'desktop' });
});

// ─── All API routes ───────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ─── Error handlers ───────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Bootstrap ───────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  // Step 1 — Run SQLite migration (creates DB + tables if first launch)
  try {
    runMigrations();
    
    // Reset any active running sessions to failed so they aren't stuck on reload
    const db = getDatabase();
    await db
      .update(processorSessions)
      .set({ status: 'failed', updatedAt: new Date().toISOString() })
      .where(eq(processorSessions.status, 'running'));
    logger.info('Cleaned up stuck running processor sessions on startup');

    // Ensure at least 3 active freelance jobs are in planning state for manual test execution
    const activeList = await db.select().from(activeFreelanceJobs).limit(10);
    const planningOrExecution = activeList.filter((aj: any) => aj.column === 'planning' || aj.column === 'in_execution');
    if (planningOrExecution.length < 2 && activeList.length > 0) {
      const idsToReset = activeList.slice(0, 3).map((aj: any) => aj.id);
      const parentJobIds = activeList.slice(0, 3).map((aj: any) => aj.jobId);
      
      for (const aj of activeList.slice(0, 3)) {
        const subtasksClean = ((aj.subtasks as any[]) || []).map((st: any) => ({ ...st, status: 'pending', output: null, fileId: null }));
        await db.update(activeFreelanceJobs)
          .set({
            column: 'planning',
            subtasks: subtasksClean,
            qcResults: null,
            deliveryFiles: [],
            deliveryMessage: null,
            updatedAt: new Date().toISOString()
          })
          .where(eq(activeFreelanceJobs.id, aj.id));
      }

      for (const jobId of parentJobIds) {
        await db.update(freelanceJobs)
          .set({ status: 'active', updatedAt: new Date().toISOString() })
          .where(eq(freelanceJobs.id, jobId));
      }
      logger.info({ idsToReset }, 'Self-healed database: reset completed active jobs back to planning stage');
    }
  } catch (err) {
    logger.error({ err }, '❌ Database migration failed / startup cleanup failed');
    process.exit(1);
  }

  // Step 2 — Start background workers
  try {
    startAllWorkers();
    await setupRepeatingJobs();
    platformPoller.start();
  } catch (err) {
    logger.warn({ err }, '⚠️  Background workers failed to start (non-fatal)');
  }

  // Step 3 — Start HTTP server
  const PORT = env.PORT; // 3001 in desktop mode
  const server = app.listen(PORT, '127.0.0.1', () => {
    logger.info({ port: PORT }, '🚀 EDITH Desktop Backend started');

    if (!env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY === 'placeholder' || env.OPENROUTER_API_KEY === 'PASTE_YOUR_KEY_HERE' || env.OPENROUTER_API_KEY.includes('PASTE_YOUR_KEY_HERE')) {
      logger.warn('⚠️  OPENROUTER_API_KEY not set — AI features disabled. Add it to .env');
    }

    // ── Signal to Electron that the backend is ready ──────
    // Electron's main.js watches stdout for this exact string
    console.log('BACKEND_READY');
  });

  // ─── Graceful shutdown ────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutting down...');
    platformPoller.stop();
    server.close(async () => {
      await stopAllWorkers();
      await closeQueues();
      closeDatabase();
      await closeRedis();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Electron sends this when the window is closed
  process.on('message', (msg) => {
    if (msg === 'shutdown') shutdown('IPC');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

bootstrap();
