import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import { z } from 'zod';
import { validateQuery, validateBody } from '../middleware/validate';
import {
  getProfitLoss, getAgentPerformance, getTimeSaved, getProjections, exportReport,
} from '../controllers/analyticsController';

const router = Router();

const periodQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
});

const exportSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  format: z.enum(['json', 'csv', 'pdf']).optional().default('json'),
});

router.get('/profit-loss', validateQuery(periodQuerySchema), getProfitLoss);
router.get('/agent-performance', asyncHandler(getAgentPerformance));
router.get('/time-saved', asyncHandler(getTimeSaved));
router.get('/projections', asyncHandler(getProjections));
router.post('/export-report', validateBody(exportSchema), exportReport);

export default router;
