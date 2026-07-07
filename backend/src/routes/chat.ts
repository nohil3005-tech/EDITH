import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { chatRateLimiter } from '../middleware/rateLimiter';
import { sendMessage, listSessions, getSessionMessages, deleteSession } from '../controllers/chatController';

const router = Router();

const sendMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  session_id: z.string().uuid().optional(),
  contextPage: z.string().optional(),
});

router.post('/message', chatRateLimiter, validateBody(sendMessageSchema), sendMessage);
router.get('/sessions', asyncHandler(listSessions));
router.get('/sessions/:id/messages', asyncHandler(getSessionMessages));
router.delete('/sessions/:id', asyncHandler(deleteSession));

export default router;
