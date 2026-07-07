import { Response } from 'express';
import { eq, sql, and, or } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { freelanceJobs } from '../db/schema/freelance';
import { JobDiscoveryService } from '../services/freelance/JobDiscoveryService';
import { successResponse, errorResponse, paginationMeta } from '../types/api';
import { getCurrentUserId } from '../utils/context';
import { AppError } from '../middleware/errorHandler';
import { DEFAULT_USER_ID } from '../config/constants';

const db = getDatabase();
const discovery = new JobDiscoveryService();

export async function scanJobs(req: AuthRequest, res: Response): Promise<void> {
  const result = await discovery.scan(req.body ?? {});
  res.json(successResponse(result));
}

export async function listJobs(req: AuthRequest, res: Response): Promise<void> {
  const { status, domain, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = parseInt(page), limitNum = Math.min(parseInt(limit), 100);
  const offset = (pageNum - 1) * limitNum;
  const userId = getCurrentUserId();

  let conditions = [or(eq(freelanceJobs.userId, userId), eq(freelanceJobs.userId, DEFAULT_USER_ID))];
  if (status) conditions.push(eq(freelanceJobs.status, status));

  const rows = await db.select().from(freelanceJobs)
    .where(and(...conditions))
    .orderBy(sql`ai_score DESC NULLS LAST, created_at DESC`)
    .limit(limitNum)
    .offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(freelanceJobs)
    .where(and(...conditions));

  res.json(successResponse(rows, paginationMeta(pageNum, limitNum, Number(count))));
}

export async function getJob(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const [job] = await db.select().from(freelanceJobs).where(and(eq(freelanceJobs.id, req.params.id), or(eq(freelanceJobs.userId, userId), eq(freelanceJobs.userId, DEFAULT_USER_ID)))).limit(1);
  if (!job) { res.status(404).json(errorResponse('NOT_FOUND', 'Job not found')); return; }
  res.json(successResponse(job));
}

export async function saveJob(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const [updated] = await db.update(freelanceJobs)
    .set({ status: 'saved', updatedAt: new Date().toISOString() as any })
    .where(and(eq(freelanceJobs.id, req.params.id), or(eq(freelanceJobs.userId, userId), eq(freelanceJobs.userId, DEFAULT_USER_ID))))
    .returning();
  if (!updated) { res.status(404).json(errorResponse('NOT_FOUND', 'Job not found')); return; }
  res.json(successResponse(updated));
}

export async function dismissJob(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const [updated] = await db.update(freelanceJobs)
    .set({ status: 'dismissed', updatedAt: new Date().toISOString() as any })
    .where(and(eq(freelanceJobs.id, req.params.id), or(eq(freelanceJobs.userId, userId), eq(freelanceJobs.userId, DEFAULT_USER_ID))))
    .returning();
  if (!updated) { res.status(404).json(errorResponse('NOT_FOUND', 'Job not found')); return; }
  res.json(successResponse(updated));
}

export async function listDomains(req: AuthRequest, res: Response): Promise<void> {
  const domainsList = ["Content", "Design", "Web Dev", "Video", "SEO", "Data", "Translation", "Voice", "Social Media", "VA", "AI Consulting", "E-Commerce"];
  res.json(successResponse(domainsList));
}
