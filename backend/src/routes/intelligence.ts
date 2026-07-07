import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import { getInsights } from '../controllers/intelligenceController';

const router = Router();

router.get('/insights', asyncHandler(getInsights));

export default router;
