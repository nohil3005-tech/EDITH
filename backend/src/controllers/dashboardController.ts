/**
 * EDITH Desktop — Dashboard Controller (SQLite)
 * Computes KPIs using JS aggregation instead of SQL GROUP BY.
 */

import { Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { freelanceJobs, activeFreelanceJobs } from '../db/schema';
import { dropshippingStores } from '../db/schema';
import { payments, invoices } from '../db/schema';
import { activityLog } from '../db/schema';
import { agentLogs } from '../db/schema';
import { successResponse } from '../types/api';
import { DEFAULT_USER_ID } from '../config/constants';

const db = getDatabase();

export async function getSummary(_req: AuthRequest, res: Response): Promise<void> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // All payments
  const allPayments = await db.select().from(payments).where(eq(payments.userId, DEFAULT_USER_ID));
  const completed   = allPayments.filter((p) => p.status === 'completed');
  const totalNet    = completed.reduce((s, p) => s + Number(p.netAmount), 0);
  const monthNet    = completed
    .filter((p) => (p.createdAt as string) >= monthStart)
    .reduce((s, p) => s + Number(p.netAmount), 0);

  // Jobs
  const allJobs = await db.select().from(freelanceJobs).where(eq(freelanceJobs.userId, DEFAULT_USER_ID));
  const activeJobCount = allJobs.filter((j) => j.status === 'active').length;
  const newJobCount    = allJobs.filter((j) => j.status === 'new').length;

  // Stores
  const allStores    = await db.select().from(dropshippingStores).where(eq(dropshippingStores.userId, DEFAULT_USER_ID));
  const activeStores = allStores.filter((s) => ['testing', 'scaling'].includes(s.status)).length;

  // Pending invoices
  const allInvoices   = await db.select().from(invoices).where(eq(invoices.userId, DEFAULT_USER_ID));
  const pendingInvs   = allInvoices.filter((i) => i.status === 'sent');
  const pendingAmount = pendingInvs.reduce((s, i) => s + Number(i.total), 0);

  // Agent logs
  const allLogs = await db.select().from(agentLogs).where(eq(agentLogs.userId, DEFAULT_USER_ID));
  const errLogs = allLogs.filter((l) => l.error !== null);
  const avgDur  = allLogs.length > 0
    ? Math.round(allLogs.reduce((s, l) => s + l.durationMs, 0) / allLogs.length)
    : 0;

  res.json(successResponse({
    earnings:     { total: totalNet, thisMonth: monthNet },
    freelance:    { totalJobs: allJobs.length, activeJobs: activeJobCount, newJobs: newJobCount },
    dropshipping: { totalStores: allStores.length, activeStores },
    invoices:     { pending: pendingInvs.length, pendingAmount },
    agents:       { totalRuns: allLogs.length, errors: errLogs.length, avgDurationMs: avgDur },
  }));
}

export async function getRevenueChart(req: AuthRequest, res: Response): Promise<void> {
  const { period = '30d' } = req.query as { period?: string };
  const days  = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const allPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, DEFAULT_USER_ID));

  const recent = allPayments.filter(
    (p) => p.status === 'completed' && (p.createdAt as string) >= since,
  );

  // Group by date and sourceType
  const map = new Map<string, { freelance: number; dropshipping: number }>();
  for (const p of recent) {
    const date = (p.createdAt as string).slice(0, 10);
    if (!map.has(date)) map.set(date, { freelance: 0, dropshipping: 0 });
    const entry = map.get(date)!;
    if (p.sourceType === 'freelance')    entry.freelance    += Number(p.netAmount);
    if (p.sourceType === 'dropshipping') entry.dropshipping += Number(p.netAmount);
  }

  const data = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  res.json(successResponse({ period, data }));
}

export async function getActivities(req: AuthRequest, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const rows  = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.userId, DEFAULT_USER_ID))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
  res.json(successResponse(rows));
}
