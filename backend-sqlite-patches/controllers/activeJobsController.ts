import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { activeFreelanceJobs, freelanceJobs, proposals } from '../db/schema/freelance';
import { ExecutionService } from '../services/freelance/ExecutionService';
import { QCService } from '../services/freelance/QCService';
import { DeliveryService } from '../services/freelance/DeliveryService';
import { successResponse, errorResponse } from '../types/api';
import { getCurrentUserId } from '../utils/context';

const db = getDatabase();
const executionService = new ExecutionService();
const qcService = new QCService();
const deliveryService = new DeliveryService();

export async function listActiveJobs(_req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const list = await db.select({
    activeJob: activeFreelanceJobs,
    parentJob: freelanceJobs
  })
  .from(activeFreelanceJobs)
  .innerJoin(freelanceJobs, eq(activeFreelanceJobs.jobId, freelanceJobs.id))
  .where(eq(activeFreelanceJobs.userId, userId));

  const mapped = list.map(item => ({
    ...item.activeJob,
    parentJob: item.parentJob
  }));

  res.json(successResponse(mapped));
}

export async function createActiveJob(req: AuthRequest, res: Response): Promise<void> {
  const { jobId, proposalId } = req.body as { jobId: string; proposalId?: string };
  
  // Fetch parent job for details to build smart subtasks
  const [job] = await db.select().from(freelanceJobs).where(eq(freelanceJobs.id, jobId)).limit(1);
  if (!job) {
    res.status(404).json(errorResponse('JOB_NOT_FOUND', 'Freelance job not found'));
    return;
  }

  const titleLower = job.title.toLowerCase();
  const tagsStr = JSON.stringify(job.tags || []).toLowerCase();

  let agentType = 'content';
  let task1Title = 'Write initial draft copy';
  let task2Title = 'Refine, fact-check and format text content';

  if (titleLower.includes('design') || titleLower.includes('figma') || titleLower.includes('logo') || tagsStr.includes('design') || tagsStr.includes('figma')) {
    agentType = 'design';
    task1Title = 'Develop graphic visual specs & layout';
    task2Title = 'Refine SVG/image assets & export files';
  } else if (titleLower.includes('web') || titleLower.includes('develop') || titleLower.includes('code') || titleLower.includes('react') || tagsStr.includes('web') || tagsStr.includes('code') || tagsStr.includes('react')) {
    agentType = 'web-dev';
    task1Title = 'Construct structural codebase component draft';
    task2Title = 'Package workspace dependencies and test execution';
  } else if (titleLower.includes('seo') || titleLower.includes('search') || tagsStr.includes('seo')) {
    agentType = 'seo';
    task1Title = 'Perform meta tags & target keyword analysis';
    task2Title = 'Refine search engine layout readability index';
  } else if (titleLower.includes('data') || titleLower.includes('scrape') || tagsStr.includes('data') || tagsStr.includes('scrape')) {
    agentType = 'data';
    task1Title = 'Assemble scraping script and parse unstructured records';
    task2Title = 'Filter duplicates and clean tabular results';
  }

  const defaultSubtasks = [
    {
      id: uuidv4(),
      title: task1Title,
      status: 'pending' as const,
      assignedAgent: agentType,
    },
    {
      id: uuidv4(),
      title: task2Title,
      status: 'pending' as const,
      assignedAgent: agentType,
    }
  ];

  const [created] = await db.insert(activeFreelanceJobs).values({
    id: uuidv4(),
    userId: getCurrentUserId(),
    jobId,
    proposalId: proposalId || null,
    column: 'planning',
    subtasks: defaultSubtasks,
    deliveryFiles: [],
  }).returning();

  await db.update(freelanceJobs).set({ status: 'active' }).where(eq(freelanceJobs.id, jobId));
  
  if (proposalId) {
    await db.update(proposals).set({ status: 'accepted', updatedAt: new Date().toISOString() }).where(eq(proposals.id, proposalId));
  }

  res.status(201).json(successResponse(created));
}

export async function moveJob(req: AuthRequest, res: Response): Promise<void> {
  let { column } = req.body as { column: string };
  
  // Align frontend column names with backend values
  if (column === 'execution') column = 'in_execution';
  if (column === 'qc') column = 'qc_review';
  if (column === 'ready') column = 'ready_to_deliver';

  const validColumns = ['planning', 'in_execution', 'qc_review', 'ready_to_deliver'];
  if (!validColumns.includes(column)) { 
    res.status(400).json(errorResponse('INVALID_COLUMN', `Column must be one of: ${validColumns.join(', ')}`)); 
    return; 
  }

  const [updated] = await db.update(activeFreelanceJobs)
    .set({ column, updatedAt: new Date().toISOString() })
    .where(eq(activeFreelanceJobs.id, req.params.id))
    .returning();

  res.json(successResponse(updated));
}

export async function updateActiveJob(req: AuthRequest, res: Response): Promise<void> {
  const { subtasks, column, deliveryMessage } = req.body as { subtasks?: any[]; column?: string; deliveryMessage?: string };
  const updateData: Record<string, any> = {};
  
  if (subtasks !== undefined) updateData.subtasks = subtasks;
  if (column !== undefined) {
    let finalCol = column;
    if (finalCol === 'execution') finalCol = 'in_execution';
    if (finalCol === 'qc') finalCol = 'qc_review';
    if (finalCol === 'ready') finalCol = 'ready_to_deliver';
    updateData.column = finalCol;
  }
  if (deliveryMessage !== undefined) updateData.deliveryMessage = deliveryMessage;

  updateData.updatedAt = new Date().toISOString();

  const [updated] = await db.update(activeFreelanceJobs)
    .set(updateData)
    .where(eq(activeFreelanceJobs.id, req.params.id))
    .returning();

  res.json(successResponse(updated));
}

export async function executeJob(req: AuthRequest, res: Response): Promise<void> {
  const { taskType = 'content', input = {} } = req.body as { taskType?: string; input?: Record<string, unknown> };
  const result = await executionService.execute(req.params.id, taskType, input);
  res.json(successResponse(result));
}

export async function runQC(req: AuthRequest, res: Response): Promise<void> {
  const result = await qcService.runQC(req.params.id, req.body ?? {});
  res.json(successResponse(result));
}

export async function deliverJob(req: AuthRequest, res: Response): Promise<void> {
  const { files = [], deliveryMessage } = req.body as { files?: Array<{ fileId: string; filename: string; url: string }>; deliveryMessage?: string };
  const delivery = await deliveryService.deliver(req.params.id, files, deliveryMessage);
  res.json(successResponse(delivery));
}

export async function createManualJob(req: AuthRequest, res: Response): Promise<void> {
  const { title, category, description, budget, platform = 'manual' } = req.body as {
    title: string;
    category: string;
    description: string;
    budget: number;
    platform?: string;
  };
  
  const userId = getCurrentUserId();
  const jobId = uuidv4();
  
  // 1. Insert freelance job
  const [job] = await db.insert(freelanceJobs).values({
    id: jobId,
    userId,
    sourcePlatform: platform,
    externalId: `manual-${uuidv4().slice(0, 8)}`,
    title,
    description,
    budgetMin: budget,
    budgetMax: budget,
    clientRating: 5.0,
    tags: [category],
    aiScore: 95,
    aiInsights: {
      matchScore: 95,
      strengths: ["Manually entered task"],
      concerns: [],
      suggestedBid: budget,
      estimatedDays: 7,
      summary: "Manual project entered directly by the user."
    },
    status: 'active',
  } as any).returning();
  
  // 2. Determine agent type and default subtasks based on category
  let agentType = 'content';
  let task1Title = 'Write initial draft copy';
  let task2Title = 'Refine, fact-check and format text content';
  
  const titleLower = title.toLowerCase();
  const categoryStr = category.toLowerCase();
  
  if (categoryStr.includes('design') || categoryStr.includes('figma') || categoryStr.includes('logo') || titleLower.includes('design') || titleLower.includes('figma') || titleLower.includes('logo')) {
    agentType = 'design';
    task1Title = 'Develop graphic visual specs & layout';
    task2Title = 'Refine SVG/image assets & export files';
  } else if (categoryStr.includes('web') || categoryStr.includes('dev') || categoryStr.includes('code') || categoryStr.includes('react') || titleLower.includes('web') || titleLower.includes('dev') || titleLower.includes('code') || titleLower.includes('react')) {
    agentType = 'web-dev';
    task1Title = 'Construct structural codebase component draft';
    task2Title = 'Package workspace dependencies and test execution';
  } else if (categoryStr.includes('seo') || categoryStr.includes('search') || titleLower.includes('seo') || titleLower.includes('search')) {
    agentType = 'seo';
    task1Title = 'Perform meta tags & target keyword analysis';
    task2Title = 'Refine search engine layout readability index';
  } else if (categoryStr.includes('data') || categoryStr.includes('scrape') || titleLower.includes('data') || titleLower.includes('scrape')) {
    agentType = 'data';
    task1Title = 'Assemble scraping script and parse unstructured records';
    task2Title = 'Filter duplicates and clean tabular results';
  }
  
  const defaultSubtasks = [
    {
      id: uuidv4(),
      title: task1Title,
      status: 'pending' as const,
      assignedAgent: agentType,
    },
    {
      id: uuidv4(),
      title: task2Title,
      status: 'pending' as const,
      assignedAgent: agentType,
    }
  ];
  
  // 3. Insert active job
  const [created] = await db.insert(activeFreelanceJobs).values({
    id: uuidv4(),
    userId,
    jobId,
    proposalId: null,
    column: 'planning',
    subtasks: defaultSubtasks,
    deliveryFiles: [],
  }).returning();
  
  res.status(201).json(successResponse(created));
}
