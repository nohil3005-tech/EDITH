import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import {
  getSummary,
  getRevenueChart,
  getActivities,
} from '../controllers/dashboardController';

const router = Router();

const chartQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).optional().default('30d'),
});

const activitiesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

router.get('/summary', asyncHandler(getSummary));
router.get('/revenue-chart', validateQuery(chartQuerySchema), getRevenueChart);
router.get('/activities', validateQuery(activitiesQuerySchema), getActivities);

export default router;
