import { Router } from 'express';
import { z } from 'zod';
import { validateParams } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { getProject } from '../controllers/clientPortalController';

const router = Router();

// Public read-only route — no auth needed beyond project ID
router.get(
  '/project/:id',
  validateParams(z.object({ id: z.string().uuid() })),
  asyncHandler(getProject)
);

export default router;
