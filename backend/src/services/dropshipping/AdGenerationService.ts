import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { dropshippingStores, ads, dropshippingProducts } from '../../db/schema/dropshipping';
import { AdGeneratorAgent } from '../agents/AdGeneratorAgent';
import { AppError } from '../../middleware/errorHandler';

interface GenerateAdsOptions {
  platforms: string[];
  budget: number;
  creativeTypes?: string[];
}

export class AdGenerationService {
  private readonly db = getDatabase();
  private readonly agent = new AdGeneratorAgent();

  async generateAds(storeId: string, options: GenerateAdsOptions) {
    const [store] = await this.db
      .select()
      .from(dropshippingStores)
      .where(eq(dropshippingStores.id, storeId))
      .limit(1);

    if (!store) throw new AppError(404, 'STORE_NOT_FOUND', 'Store not found');

    const [product] = await this.db
      .select()
      .from(dropshippingProducts)
      .where(eq(dropshippingProducts.id, store.productId))
      .limit(1);

    const agentResult = await this.agent.execute({
      product,
      store,
      platforms: options.platforms,
      budget: options.budget,
    });

    const campaigns = (agentResult.campaigns as Array<{
      platform: string;
      adSets: Array<{ ads: Array<{ name: string; format: string; headline: string; primaryText: string; callToAction: string }> }>;
    }>) || [];

    const savedAds = [];

    for (const campaign of campaigns) {
      for (const adSet of campaign.adSets || []) {
        for (const ad of adSet.ads || []) {
          const [saved] = await this.db.insert(ads).values({
            id: uuidv4(),
            storeId,
            platform: campaign.platform.toLowerCase(),
            creativeType: (ad.format?.includes('video') ? 'video' : ad.format?.includes('carousel') ? 'carousel' : 'image'),
            adName: ad.name || `${campaign.platform} Ad`,
            spend: 0 as any,
            revenue: 0 as any,
            roas: 0,
            status: 'draft',
            metadata: ad as unknown as Record<string, unknown>,
          } as any).returning();
          savedAds.push(saved);
        }
      }
    }

    return { ads: savedAds, strategy: agentResult };
  }
}
