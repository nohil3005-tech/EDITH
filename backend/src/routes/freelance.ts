import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import { scanRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/asyncHandler';
import { scanJobs, listJobs, getJob, saveJob, dismissJob, listDomains } from '../controllers/freelanceController';
import { generateProposal, listProposals, updateProposal, sendProposal } from '../controllers/proposalsController';
import { listActiveJobs, createActiveJob, moveJob, executeJob, runQC, deliverJob, updateActiveJob, createManualJob } from '../controllers/activeJobsController';
import { listCompleted } from '../controllers/completedController';

const router = Router();

const scanBodySchema = z.object({
  platforms: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  minBudget: z.number().optional(),
  maxBudget: z.number().optional(),
  keywords: z.array(z.string()).optional(),
}).optional();

const listJobsSchema = z.object({
  status: z.string().optional(),
  domain: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const moveJobSchema = z.object({
  column: z.enum(['planning', 'in_execution', 'qc_review', 'ready_to_deliver']),
});

const createActiveJobSchema = z.object({
  jobId: z.string().uuid(),
  proposalId: z.string().uuid().optional(),
});

const createManualJobSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  budget: z.number().min(0),
  platform: z.string().optional(),
});

const executeJobSchema = z.object({
  taskType: z.enum(['content', 'web-dev', 'design', 'data', 'seo']).optional().default('content'),
  input: z.record(z.unknown()).optional().default({}),
});

const deliverJobSchema = z.object({
  files: z.array(z.object({
    fileId: z.string(),
    filename: z.string(),
    url: z.string(),
  })).optional().default([]),
  deliveryMessage: z.string().optional(),
});

const updateProposalSchema = z.object({
  finalText: z.string().optional(),
  bidAmount: z.number().optional(),
  deliveryDays: z.number().optional(),
  portfolioItems: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string().optional(),
  })).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
});

const sendProposalSchema = z.object({
  email: z.string().email().optional(),
  clientName: z.string().optional(),
});

// ── Job discovery ────────────────────────────────────────────
router.post('/jobs/scan',             scanRateLimiter, validateBody(scanBodySchema), asyncHandler(scanJobs));
router.get('/jobs',                   validateQuery(listJobsSchema),  asyncHandler(listJobs));
router.get('/jobs/:id',                                               asyncHandler(getJob));
router.post('/jobs/:id/save',                                         asyncHandler(saveJob));
router.post('/jobs/:id/dismiss',                                      asyncHandler(dismissJob));

// ── Proposals ────────────────────────────────────────────────
router.post('/jobs/:jobId/proposals/generate',                        asyncHandler(generateProposal));
router.get('/proposals',                                              asyncHandler(listProposals));
router.put('/proposals/:id',          validateBody(updateProposalSchema), asyncHandler(updateProposal));
router.post('/proposals/:id/send',    validateBody(sendProposalSchema),   asyncHandler(sendProposal));

// ── Active jobs (kanban) ─────────────────────────────────────
router.get('/active-jobs',                                            asyncHandler(listActiveJobs));
router.post('/active-jobs',           validateBody(createActiveJobSchema), asyncHandler(createActiveJob));
router.post('/active-jobs/manual',    validateBody(createManualJobSchema), asyncHandler(createManualJob));
router.put('/active-jobs/:id/move',   validateBody(moveJobSchema),        asyncHandler(moveJob));
router.put('/active-jobs/:id',                                       asyncHandler(updateActiveJob));
router.post('/active-jobs/:id/execute', validateBody(executeJobSchema),   asyncHandler(executeJob));
router.post('/active-jobs/:id/qc',                                    asyncHandler(runQC));
router.post('/active-jobs/:id/deliver', validateBody(deliverJobSchema),  asyncHandler(deliverJob));

// ── Completed ────────────────────────────────────────────────
router.get('/completed',                                              asyncHandler(listCompleted));
router.get('/domains',                                                asyncHandler(listDomains));

export default router;
