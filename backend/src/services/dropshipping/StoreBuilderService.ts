import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { dropshippingProducts, dropshippingStores } from '../../db/schema/dropshipping';
import { StoreBuilderAgent } from '../agents/StoreBuilderAgent';
import { AppError } from '../../middleware/errorHandler';
import { getCurrentUserId } from '../../utils/context';

export class StoreBuilderService {
  private readonly db = getDatabase();
  private readonly agent = new StoreBuilderAgent();

  async buildStore(productId: string, options: { platform?: string; budget?: string } = {}) {
    const [product] = await this.db
      .select()
      .from(dropshippingProducts)
      .where(eq(dropshippingProducts.id, productId))
      .limit(1);

    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');

    const storeData = await this.agent.execute({
      product,
      platform: options.platform || 'shopify',
      budget: options.budget || 'starter',
    });

    const [store] = await this.db
      .insert(dropshippingStores)
      .values({
        id: uuidv4(),
        userId: getCurrentUserId(),
        productId,
        name: (storeData.storeName as string) || 'New Store',
        domain: (storeData.domain as string) || null,
        platform: options.platform || 'shopify',
        settings: {
          primaryColor: ((storeData.colorPalette as Record<string, string>)?.primary) || '#3B82F6',
          logoUrl: null,
          tagline: (storeData.tagline as string) || '',
          targetCountries: ['US', 'UK', 'CA'],
          pricingMultiplier: 3,
          shippingDays: 7,
          ...storeData,
        },
        status: 'new',
      } as any)
      .returning();

    return { store, blueprint: storeData };
  }
}
