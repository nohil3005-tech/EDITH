import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import { healthCheck, queuesHealth, servicesHealth } from '../controllers/healthController';

const router = Router();

router.get('/', asyncHandler(healthCheck));
router.get('/queues', asyncHandler(queuesHealth));
router.get('/services', asyncHandler(servicesHealth));

export default router;
