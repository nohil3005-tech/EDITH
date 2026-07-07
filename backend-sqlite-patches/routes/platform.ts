import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  connectAccount,
  listAccounts,
  updateAccount,
  deleteAccount,
  testConnection,
  syncAccount,
  listNotifications,
  listMessages,
  replyToMessage,
} from '../controllers/platformController';

const router = Router();

router.post('/connect', asyncHandler(connectAccount));
router.get('/accounts', asyncHandler(listAccounts));
router.put('/:id', asyncHandler(updateAccount));
router.delete('/:id', asyncHandler(deleteAccount));
router.post('/:id/test', asyncHandler(testConnection));
router.post('/:id/sync', asyncHandler(syncAccount));
router.get('/notifications', asyncHandler(listNotifications));
router.get('/messages', asyncHandler(listMessages));
router.post('/messages/:id/reply', asyncHandler(replyToMessage));

export default router;
