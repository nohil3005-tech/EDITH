import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { getReferralStats, listReferrals, withdrawCommission } from '../controllers/referralsController';

const router = Router();

const withdrawSchema = z.object({
  amount: z.number().min(10, 'Minimum withdrawal is $10'),
});

router.get('/stats', asyncHandler(getReferralStats));
router.get('/list', asyncHandler(listReferrals));
router.post('/withdraw', validateBody(withdrawSchema), withdrawCommission);

export default router;
