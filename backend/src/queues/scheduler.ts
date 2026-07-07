/**
 * EDITH Desktop — Job Scheduler
 * Replaces BullMQ repeatable jobs with setInterval.
 * Runs background scans and optimizations on a timer.
 */

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getQueue, getQueues, closeAllQueues } from './inMemoryQueue';
import { AutomationService } from '../services/freelance/AutomationService';
import { getDatabase } from '../config/database';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_USER_ID } from '../config/constants';

// Keep interval handles so we can clear them on shutdown
const intervals: NodeJS.Timeout[] = [];

let lastFreelanceScanTime = 0;
let lastProductScanTime = 0;
let lastAdOptTime = 0;

export function getSchedulerQueues() {
  return getQueues();
}

export async function setupRepeatingJobs(): Promise<void> {
  const db = getDatabase();
  const automationSvc = new AutomationService();

  // Run a master scheduler tick every 30 seconds
  const masterInterval = setInterval(async () => {
    try {
      // Get user preferences from SQLite
      const [user] = await db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).limit(1);
      if (!user) return;

      let prefs: Record<string, any> = {};
      if (typeof user.preferences === 'string') {
        try {
          prefs = JSON.parse(user.preferences);
        } catch {
          prefs = {};
        }
      } else if (user.preferences && typeof user.preferences === 'object') {
        prefs = user.preferences as Record<string, any>;
      }

      const now = Date.now();

      // Read rules
      const autoScanJobs = prefs['Auto-scan jobs'] !== false;
      const autoScanProducts = prefs['Auto-scan products'] !== false;
      const autoKillAds = prefs['Auto-kill ads below ROAS'] !== false;
      const autoScaleAds = prefs['Auto-scale ads above ROAS'] !== false;

      // Scan frequency in hours (defaults to 4h)
      const scanFrequencyHours = Number(prefs.scanFrequencyHours) || env.JOB_SCAN_INTERVAL_HOURS || 4;
      const adOptIntervalHours = env.AD_OPTIMIZATION_INTERVAL_HOURS || 6;

      const scanIntervalMs = scanFrequencyHours * 60 * 60 * 1000;
      const adOptIntervalMs = adOptIntervalHours * 60 * 60 * 1000;

      // 1. Freelance job scan
      if (autoScanJobs && (now - lastFreelanceScanTime >= scanIntervalMs || lastFreelanceScanTime === 0)) {
        logger.info({ scanFrequencyHours }, '⏰ Scheduler: Triggering auto-scan for freelance jobs');
        lastFreelanceScanTime = now;
        const q = getQueue('scraping');
        await q.add('scan-freelance-jobs', { type: 'freelance', platforms: ['upwork', 'fiverr'] });
      }

      // 2. Product scan
      if (autoScanProducts && (now - lastProductScanTime >= scanIntervalMs || lastProductScanTime === 0)) {
        logger.info({ scanFrequencyHours }, '⏰ Scheduler: Triggering auto-scan for dropshipping products');
        lastProductScanTime = now;
        const q = getQueue('scraping');
        await q.add('scan-dropshipping-products', { type: 'dropshipping', sources: ['aliexpress', 'tiktok'] });
      }

      // 3. Ad optimization
      if ((autoKillAds || autoScaleAds) && (now - lastAdOptTime >= adOptIntervalMs || lastAdOptTime === 0)) {
        logger.info('⏰ Scheduler: Triggering ad optimization');
        lastAdOptTime = now;
        const q = getQueue('optimization');
        await q.add('optimize-ads', { type: 'ads' });
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error in master scheduler tick');
    }
  }, 30000);

  // Run autonomous freelance automation tick every 30 seconds
  const automationInterval = setInterval(async () => {
    await automationSvc.runAutomationTick();
  }, 30000);

  intervals.push(masterInterval, automationInterval);

  logger.info('⏰ Repeating jobs scheduled dynamically via master tick');
}

export async function closeQueues(): Promise<void> {
  intervals.forEach(clearInterval);
  intervals.length = 0;
  await closeAllQueues();
  logger.info('All in-memory queues closed');
}

export { getQueues };
