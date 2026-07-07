import { Response } from 'express';
import { eq, sql, desc, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { dropshippingProducts } from '../db/schema/dropshipping';
import { ProductDiscoveryService } from '../services/dropshipping/ProductDiscoveryService';
import { ValidationService } from '../services/dropshipping/ValidationService';
import { successResponse, errorResponse, paginationMeta } from '../types/api';
import { getCurrentUserId } from '../utils/context';

const db = getDatabase();
const discoveryService = new ProductDiscoveryService();
const validationService = new ValidationService();

export async function scanProducts(req: AuthRequest, res: Response): Promise<void> {
  const result = await discoveryService.scan(req.body ?? {});
  res.json(successResponse(result));
}

export async function listProducts(req: AuthRequest, res: Response): Promise<void> {
  const { sort = 'trending', page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = parseInt(page), limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;
  const userId = getCurrentUserId();

  const orderBy = sort === 'trending' ? desc(dropshippingProducts.trendingScore) : desc(dropshippingProducts.createdAt);
  const rows = await db.select().from(dropshippingProducts)
    .where(eq(dropshippingProducts.userId, userId))
    .orderBy(orderBy).limit(limitNum).offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` }).from(dropshippingProducts).where(eq(dropshippingProducts.userId, userId));
  res.json(successResponse(rows, paginationMeta(pageNum, limitNum, Number(count))));
}

export async function getProduct(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const [product] = await db.select().from(dropshippingProducts).where(and(eq(dropshippingProducts.id, req.params.id), eq(dropshippingProducts.userId, userId))).limit(1);
  if (!product) { res.status(404).json(errorResponse('NOT_FOUND', 'Product not found')); return; }
  res.json(successResponse(product));
}

export async function validateProduct(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const [product] = await db.select().from(dropshippingProducts).where(and(eq(dropshippingProducts.id, req.params.id), eq(dropshippingProducts.userId, userId))).limit(1);
  if (!product) { res.status(404).json(errorResponse('NOT_FOUND', 'Product not found')); return; }
  
  // Start async validation (don't await — it takes time)
  validationService.startValidation(req.params.id).catch(() => {});
  res.json(successResponse({ message: 'Validation started', productId: req.params.id }));
}

export async function getValidationStatus(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const [product] = await db.select().from(dropshippingProducts).where(and(eq(dropshippingProducts.id, req.params.id), eq(dropshippingProducts.userId, userId))).limit(1);
  if (!product) { res.status(404).json(errorResponse('NOT_FOUND', 'Product not found')); return; }

  const steps = await validationService.getStatus(req.params.id);
  res.json(successResponse(steps));
}
