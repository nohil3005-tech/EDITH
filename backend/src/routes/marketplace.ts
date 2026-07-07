import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import {
  listPlugins, getPlugin, installPlugin, uninstallPlugin, listInstalled, togglePlugin,
} from '../controllers/marketplaceController';

const router = Router();

const listPluginsSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

router.get('/plugins', validateQuery(listPluginsSchema), listPlugins);
router.get('/plugins/:id', asyncHandler(getPlugin));
router.post('/plugins/:id/install', asyncHandler(installPlugin));
router.delete('/plugins/:id/uninstall', asyncHandler(uninstallPlugin));
router.get('/installed', asyncHandler(listInstalled));
router.put('/installed/:id/toggle', asyncHandler(togglePlugin));

export default router;
