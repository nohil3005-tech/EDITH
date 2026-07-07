/**
 * EDITH Desktop — Analytics Controller (SQLite)
 */

import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { agentLogs } from '../db/schema';
import { DropshippingAnalyticsService } from '../services/dropshipping/AnalyticsService';
import { PaymentService } from '../services/payment/PaymentService';
import { successResponse } from '../types/api';
import { DEFAULT_USER_ID } from '../config/constants';

const db           = getDatabase();
const dsAnalytics  = new DropshippingAnalyticsService();
const paymentSvc   = new PaymentService();

export async function getProfitLoss(req: AuthRequest, res: Response): Promise<void> {
  const { period = '30d' } = req.query as { period?: string };
  const earnings = await paymentSvc.getEarnings(period);
  res.json(successResponse(earnings));
}

export async function getAgentPerformance(_req: AuthRequest, res: Response): Promise<void> {
  const logs = await db
    .select()
    .from(agentLogs)
    .where(eq(agentLogs.userId, DEFAULT_USER_ID));

  // Aggregate in JS
  const agentMap = new Map<string, { runs: number; errors: number; totalMs: number }>();
  for (const log of logs) {
    if (!agentMap.has(log.agentName)) agentMap.set(log.agentName, { runs: 0, errors: 0, totalMs: 0 });
    const entry = agentMap.get(log.agentName)!;
    entry.runs   += 1;
    entry.totalMs += log.durationMs;
    if (log.error) entry.errors += 1;
  }

  const stats = Array.from(agentMap.entries())
    .sort(([, a], [, b]) => b.runs - a.runs)
    .map(([agentName, data]) => ({
      agentName,
      totalRuns:    data.runs,
      successRate:  data.runs > 0 ? Math.round(((data.runs - data.errors) / data.runs) * 100) : 100,
      avgDurationMs: data.runs > 0 ? Math.round(data.totalMs / data.runs) : 0,
      errors:       data.errors,
    }));

  res.json(successResponse(stats));
}

export async function getTimeSaved(_req: AuthRequest, res: Response): Promise<void> {
  const logs = await db
    .select({ id: agentLogs.id })
    .from(agentLogs)
    .where(eq(agentLogs.userId, DEFAULT_USER_ID));

  const runs        = logs.length;
  const hoursSaved  = Math.round((runs * 45) / 60);
  const valueUSD    = hoursSaved * 50;

  res.json(successResponse({
    totalAgentRuns:      runs,
    estimatedHoursSaved: hoursSaved,
    estimatedValueUSD:   valueUSD,
  }));
}

export async function getProjections(_req: AuthRequest, res: Response): Promise<void> {
  const earnings = await paymentSvc.getEarnings('30d');
  const monthly  = earnings.netEarnings;

  res.json(successResponse({
    currentMonthRevenue: monthly,
    projectedQuarter:    parseFloat((monthly * 3 * 1.15).toFixed(2)),
    projectedAnnual:     parseFloat((monthly * 12 * 1.2).toFixed(2)),
    growthAssumption:    '15% MoM',
    confidence:          'medium',
  }));
}

export async function exportReport(req: AuthRequest, res: Response): Promise<void> {
  const { period = '30d', format = 'json' } = req.body as { period?: string; format?: string };
  const earnings    = await paymentSvc.getEarnings(period);
  const dsOverview  = await dsAnalytics.getOverview();

  const report = {
    generatedAt:  new Date().toISOString(),
    period,
    earnings,
    dropshipping: dsOverview,
  };

  if (format === 'csv') {
    const csv = [
      'Period,Net Earnings,Freelance,Dropshipping,Total Revenue',
      `${period},${earnings.netEarnings},${earnings.freelanceEarnings},${earnings.dropshippingEarnings},${earnings.totalRevenue}`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="edith-report.csv"');
    res.send(csv);
    return;
  }

  res.json(successResponse(report));
}
