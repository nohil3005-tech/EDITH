import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validate';
import { scanRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/asyncHandler';
import { successResponse } from '../types/api';
import { scanProducts, listProducts, getProduct, validateProduct, getValidationStatus } from '../controllers/dropshippingController';
import { createStore, listStores, getStore, updateStoreSettings, killStore } from '../controllers/storesController';
import { listAds, generateAds, pauseAd, resumeAd } from '../controllers/adsController';
import { DropshippingAnalyticsService } from '../services/dropshipping/AnalyticsService';

const router = Router();
const analyticsService = new DropshippingAnalyticsService();

const scanBodySchema = z.object({
  sources: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  limit: z.number().optional(),
}).optional();

const listProductsSchema = z.object({
  sort: z.enum(['trending', 'newest', 'score']).optional().default('trending'),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().max(100).optional().default(20),
});

const createStoreSchema = z.object({
  productId: z.string().uuid(),
  platform: z.enum(['shopify', 'woocommerce', 'custom']).optional(),
  budget: z.string().optional(),
});

const generateAdsSchema = z.object({
  platforms: z.array(z.string()).min(1),
  budget: z.number().min(1),
  creativeTypes: z.array(z.string()).optional(),
});

// ── Products ─────────────────────────────────────────────────
router.post('/products/scan',                 scanRateLimiter, validateBody(scanBodySchema), asyncHandler(scanProducts));
router.get('/products',                       validateQuery(listProductsSchema),              asyncHandler(listProducts));
router.get('/products/:id',                                                                  asyncHandler(getProduct));
router.post('/products/:id/validate',                                                        asyncHandler(validateProduct));
router.get('/products/:id/validation-status',                                                asyncHandler(getValidationStatus));

// ── Stores ────────────────────────────────────────────────────
router.post('/stores',                        validateBody(createStoreSchema),               asyncHandler(createStore));
router.get('/stores',                                                                        asyncHandler(listStores));
router.get('/stores/:id',                                                                    asyncHandler(getStore));
router.put('/stores/:id/settings',                                                           asyncHandler(updateStoreSettings));
router.post('/stores/:id/kill',                                                              asyncHandler(killStore));

// ── Ads ───────────────────────────────────────────────────────
router.get('/stores/:storeId/ads',                                                           asyncHandler(listAds));
router.post('/stores/:storeId/ads/generate',  validateBody(generateAdsSchema),               asyncHandler(generateAds));
router.put('/stores/:storeId/ads/:adId/pause',                                               asyncHandler(pauseAd));
router.put('/stores/:storeId/ads/:adId/resume',                                              asyncHandler(resumeAd));

// ── Analytics ─────────────────────────────────────────────────
router.get('/analytics/overview', asyncHandler(async (_req, res) => {
  const data = await analyticsService.getOverview();
  res.json(successResponse(data));
}));

router.get('/analytics/:storeId', asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query as { period?: string };
  const data = await analyticsService.getStoreAnalytics(req.params.storeId, period);
  res.json(successResponse(data));
}));

export default router;
