import { getDatabase } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import { dropshippingProducts } from '../../db/schema/dropshipping';
import { DiscoveryAgent } from '../agents/DiscoveryAgent';
import { logger } from '../../utils/logger';
import { getCurrentUserId } from '../../utils/context';
import { ProductScanResult } from '../../types/dropshipping';
import { sql, and, eq } from 'drizzle-orm';

export class ProductDiscoveryService {
  private readonly db = getDatabase();
  private readonly agent = new DiscoveryAgent();

  async scan(options: { sources?: string[]; categories?: string[]; limit?: number } = {}): Promise<ProductScanResult> {
    const result = await this.agent.execute({
      sources: options.sources || ['aliexpress', 'tiktok'],
      categories: options.categories || [],
      limit: options.limit || 10,
    });

    const products = (result.products as Partial<import('../../types/dropshipping').DropshippingProduct>[]) || [];
    let newCount = 0;
    let duplicateCount = 0;
    const saved = [];

    for (const product of products) {
      try {
        const existing = await this.db
          .select({ id: dropshippingProducts.id })
          .from(dropshippingProducts)
          .where(
            and(
              eq(dropshippingProducts.source, product.source || ''),
              eq(dropshippingProducts.name, product.name || ''),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          duplicateCount++;
          continue;
        }

        const [savedProduct] = await this.db
          .insert(dropshippingProducts)
          .values({
            id: uuidv4(),
            userId: getCurrentUserId(),
            source: product.source || 'unknown',
            name: product.name || 'Unnamed Product',
            description: product.description || '',
            costPrice: Number(product.costPrice || 0) as any,
            targetSellPrice: Number(product.targetSellPrice || 0) as any,
            category: product.category || 'general',
            trendingScore: product.trendingScore || 0,
            trendData: product.trendData || null,
            validationStatus: 'pending',
            aiScore: product.aiScore || null,
            images: product.images || [],
          } as any)
          .returning();

        saved.push(savedProduct);
        newCount++;
      } catch (err) {
        logger.error({ err, product: product.name }, 'Failed to save product');
      }
    }

    return {
      scanned: products.length,
      newProducts: newCount,
      duplicates: duplicateCount,
      products: saved as unknown as import('../../types/dropshipping').DropshippingProduct[],
    };
  }
}
