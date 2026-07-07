import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { ads } from '../db/schema/dropshipping';
import { AdGenerationService } from '../services/dropshipping/AdGenerationService';
import { successResponse, errorResponse } from '../types/api';

const db = getDatabase();
const adService = new AdGenerationService();

export async function listAds(req: AuthRequest, res: Response): Promise<void> {
  const storeAds = await db.select().from(ads).where(eq(ads.storeId, req.params.storeId));
  res.json(successResponse(storeAds));
}

export async function generateAds(req: AuthRequest, res: Response): Promise<void> {
  const { platforms = ['facebook', 'instagram'], budget = 20, creativeTypes = ['image'] } = req.body as {
    platforms?: string[]; budget?: number; creativeTypes?: string[];
  };
  const result = await adService.generateAds(req.params.storeId, { platforms, budget, creativeTypes });
  res.json(successResponse(result));
}

export async function pauseAd(req: AuthRequest, res: Response): Promise<void> {
  const [updated] = await db.update(ads).set({ status: 'paused', updatedAt: new Date().toISOString() })
    .where(eq(ads.id, req.params.adId)).returning();
  if (!updated) { res.status(404).json(errorResponse('NOT_FOUND', 'Ad not found')); return; }
  res.json(successResponse(updated));
}

export async function resumeAd(req: AuthRequest, res: Response): Promise<void> {
  const [updated] = await db.update(ads).set({ status: 'active', updatedAt: new Date().toISOString() })
    .where(eq(ads.id, req.params.adId)).returning();
  if (!updated) { res.status(404).json(errorResponse('NOT_FOUND', 'Ad not found')); return; }
  res.json(successResponse(updated));
}
