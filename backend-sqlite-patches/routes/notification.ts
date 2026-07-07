import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  subscribe,
  listInAppNotifications,
} from '../controllers/notificationController';

const router = Router();

router.post('/subscribe', asyncHandler(subscribe));
router.get('/', asyncHandler(listInAppNotifications));

export default router;
