import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  searchPlatforms,
  getPopularPlatforms,
  listUserPlatforms,
  addUserPlatform,
  removeUserPlatform,
  updatePlatformSettings,
  syncExtensionData,
  syncJobsFromExtension
} from '../controllers/platformHubController';

const router = Router();

router.get('/search', asyncHandler(searchPlatforms));
router.get('/popular', asyncHandler(getPopularPlatforms));
router.get('/user', asyncHandler(listUserPlatforms));
router.post('/add', asyncHandler(addUserPlatform));
router.post('/sync-extension', asyncHandler(syncExtensionData));
router.post('/sync-jobs', asyncHandler(syncJobsFromExtension));
router.delete('/:id', asyncHandler(removeUserPlatform));
router.put('/:id/settings', asyncHandler(updatePlatformSettings));

export default router;
