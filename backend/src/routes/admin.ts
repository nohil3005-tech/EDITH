import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  listUsers,
  getUsersCount,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getSystemSettings,
  updateSystemSettings,
  addToWhitelist,
  removeFromWhitelist,
  listWhitelist,
  listNotifications,
  markNotificationRead,
} from '../controllers/adminController';

const router = Router();

// Validation Schemas
const statusSchema = z.object({
  status: z.enum(['active', 'blocked', 'pending']),
});

const roleSchema = z.object({
  role: z.enum(['admin', 'user']),
});

const whitelistSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'user']).optional().default('user'),
});

const settingsSchema = z.object({
  autoApproveLogins: z.boolean(),
  notifyOnNewLogin: z.boolean(),
  allowAnyGoogleAccount: z.boolean(),
});

// ─── User Management ──────────────────────────────────────────
router.get('/users', asyncHandler(listUsers));
router.get('/users/count', asyncHandler(getUsersCount));
router.put('/users/:userId/status', validateBody(statusSchema), asyncHandler(updateUserStatus));
router.put('/users/:userId/role', validateBody(roleSchema), asyncHandler(updateUserRole));
router.delete('/users/:userId', asyncHandler(deleteUser));

// ─── Whitelist Management ─────────────────────────────────────
router.get('/whitelist', asyncHandler(listWhitelist));
router.post('/whitelist', validateBody(whitelistSchema), asyncHandler(addToWhitelist));
router.delete('/whitelist/:email', asyncHandler(removeFromWhitelist));

// ─── Global System Settings ───────────────────────────────────
router.get('/settings', asyncHandler(getSystemSettings));
router.put('/settings', validateBody(settingsSchema), asyncHandler(updateSystemSettings));

// ─── Notifications ────────────────────────────────────────────
router.get('/notifications', asyncHandler(listNotifications));
router.put('/notifications/:id/read', asyncHandler(markNotificationRead));

export default router;
