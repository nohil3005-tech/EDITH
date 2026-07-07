import { Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { dropshippingStores } from '../db/schema/dropshipping';
import { StoreBuilderService } from '../services/dropshipping/StoreBuilderService';
import { successResponse, errorResponse } from '../types/api';
import { getCurrentUserId } from '../utils/context';

const db = getDatabase();
const storeBuilder = new StoreBuilderService();

export async function createStore(req: AuthRequest, res: Response): Promise<void> {
  const { productId, platform, budget } = req.body as { productId: string; platform?: string; budget?: string };
  const result = await storeBuilder.buildStore(productId, { platform, budget });
  res.status(201).json(successResponse(result));
}

export async function listStores(_req: AuthRequest, res: Response): Promise<void> {
  const stores = await db.select().from(dropshippingStores).where(eq(dropshippingStores.userId, getCurrentUserId()));
  res.json(successResponse(stores));
}

export async function getStore(req: AuthRequest, res: Response): Promise<void> {
  const [store] = await db.select().from(dropshippingStores).where(and(eq(dropshippingStores.id, req.params.id), eq(dropshippingStores.userId, getCurrentUserId()))).limit(1);
  if (!store) { res.status(404).json(errorResponse('NOT_FOUND', 'Store not found')); return; }
  res.json(successResponse(store));
}

export async function updateStoreSettings(req: AuthRequest, res: Response): Promise<void> {
  const [updated] = await db.update(dropshippingStores)
    .set({ settings: req.body, updatedAt: new Date().toISOString() as any })
    .where(and(eq(dropshippingStores.id, req.params.id), eq(dropshippingStores.userId, getCurrentUserId())))
    .returning();
  if (!updated) { res.status(404).json(errorResponse('NOT_FOUND', 'Store not found')); return; }
  res.json(successResponse(updated));
}

export async function killStore(req: AuthRequest, res: Response): Promise<void> {
  const [updated] = await db.update(dropshippingStores)
    .set({ status: 'killed', updatedAt: new Date().toISOString() as any })
    .where(and(eq(dropshippingStores.id, req.params.id), eq(dropshippingStores.userId, getCurrentUserId())))
    .returning();
  if (!updated) { res.status(404).json(errorResponse('NOT_FOUND', 'Store not found')); return; }
  res.json(successResponse(updated));
}
