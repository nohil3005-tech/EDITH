import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  listAgents, getAgent, updateAgentConfig, getAgentLogs, pauseAgent, resumeAgent,
} from '../controllers/agentsController';

const router = Router();

const logsQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

const configSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(100).max(8000).optional(),
  enabled: z.boolean().optional(),
  dailyLimit: z.number().optional(),
}).passthrough();

router.get('/', asyncHandler(listAgents));
router.get('/:id', asyncHandler(getAgent));
router.put('/:id/config', validateBody(configSchema), updateAgentConfig);
router.get('/:id/logs', validateQuery(logsQuerySchema), getAgentLogs);
router.post('/:id/pause', asyncHandler(pauseAgent));
router.post('/:id/resume', asyncHandler(resumeAgent));

export default router;
