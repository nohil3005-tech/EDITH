import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  startSession,
  getSessionStatus,
  pauseSession,
  resumeSession,
  cancelSession,
  downloadSessionFile,
} from '../controllers/processorController';

const router = Router();

router.post('/start/:jobId', asyncHandler(startSession));
router.get('/status/:sessionId', asyncHandler(getSessionStatus));
router.post('/:sessionId/pause', asyncHandler(pauseSession));
router.post('/:sessionId/resume', asyncHandler(resumeSession));
router.post('/:sessionId/cancel', asyncHandler(cancelSession));
router.get('/:sessionId/download', asyncHandler(downloadSessionFile));

export default router;
