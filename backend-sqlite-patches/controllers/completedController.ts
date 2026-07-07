import { Response } from 'express';
import { eq, sql, gte, lte, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { freelanceJobs } from '../db/schema/freelance';
import { successResponse } from '../types/api';
import { getCurrentUserId } from '../utils/context';

const db = getDatabase();

export async function listCompleted(req: AuthRequest, res: Response): Promise<void> {
  const { start, end, format } = req.query as { start?: string; end?: string; format?: string };
  const userId = getCurrentUserId();

  let conditions = [
    eq(freelanceJobs.userId, userId),
    eq(freelanceJobs.status, 'completed')
  ];

  if (start) conditions.push(gte(freelanceJobs.createdAt, new Date(start).toISOString()));
  if (end) conditions.push(lte(freelanceJobs.createdAt, new Date(end).toISOString()));

  const rows = await db.select().from(freelanceJobs)
    .where(and(...conditions))
    .orderBy(sql`created_at DESC`);

  if (format === 'csv') {
    const headers = ['id', 'title', 'source_platform', 'budget_max', 'status', 'created_at'];
    const csv = [
      headers.join(','),
      ...rows.map((r) => [r.id, `"${r.title}"`, r.sourcePlatform, r.budgetMax ?? 0, r.status, String(r.createdAt)].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="completed-jobs.csv"');
    res.send(csv);
    return;
  }

  res.json(successResponse(rows));
}
