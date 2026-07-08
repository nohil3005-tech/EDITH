import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import {
  getConfig,
  gate1Verify,
  gate2Verify,
  googleLogin,
  getProfile,
  updateProfile,
  updatePaymentSettings,
  completeOnboarding,
  exportData,
} from '../controllers/authController';

const router = Router();

// Validation Schemas
const gate1Schema = z.object({
  codename: z.string().min(1),
});

const gate2Schema = z.object({
  codename: z.string().min(1),
});

const googleLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  supabaseId: z.string().min(1),
  avatarUrl: z.string().nullable().optional(),
});

const updateProfileSchema = z.object({
  profile: z.record(z.unknown()).optional(),
  preferences: z.record(z.unknown()).optional(),
});

const paymentSettingsSchema = z.record(z.unknown());

// ─── Public Gate Endpoints ────────────────────────────────────
router.get('/config', asyncHandler(getConfig));
router.post('/gate1', validateBody(gate1Schema), asyncHandler(gate1Verify));
router.post('/gate2', validateBody(gate2Schema), asyncHandler(gate2Verify));
router.post('/google/login', validateBody(googleLoginSchema), asyncHandler(googleLogin));

// ─── Protected Routes (Requires Gate 3 Session Token) ─────────
router.use(asyncHandler(authMiddleware));

router.get('/profile', asyncHandler(getProfile));
router.put('/profile', validateBody(updateProfileSchema), asyncHandler(updateProfile));
router.put('/payment-settings', validateBody(paymentSettingsSchema), asyncHandler(updatePaymentSettings));
router.post('/onboarding/complete', asyncHandler(completeOnboarding));
router.get('/export-data', asyncHandler(exportData));

export default router;
