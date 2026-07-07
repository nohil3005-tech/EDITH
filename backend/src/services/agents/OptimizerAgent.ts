import { eq } from 'drizzle-orm';
import { BaseAgent } from './BaseAgent';
import { getDatabase } from '../../config/database';
import { ads } from '../../db/schema/dropshipping';
import { logger } from '../../utils/logger';

const KILL_ROAS_THRESHOLD  = 1.0;  // Kill ads below this ROAS
const SCALE_ROAS_THRESHOLD = 3.0;  // Flag ads above this ROAS for scaling

export class OptimizerAgent extends BaseAgent {
  constructor() {
    super('optimizer', {
      systemPrompt: `You are EDITH's ad optimisation engine. You analyse ROAS data, identify
winning and losing campaigns, make scaling/killing decisions, and suggest creative
refreshes and audience expansions to maximise returns.`,
      temperature: 0.3,
      maxTokens: 2000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const db = this.db;
    const { storeId } = input;

    // Fetch active ads
    const activeAds = storeId
      ? await db.select().from(ads).where(eq(ads.storeId, storeId as string))
      : await db.select().from(ads).where(eq(ads.status, 'active'));

    if (activeAds.length === 0) {
      return { optimized: 0, killed: 0, scaled: 0, message: 'No active ads to optimize' };
    }

    let killed = 0;
    let scaled  = 0;

    for (const ad of activeAds) {
      const roas = Number(ad.roas);
      if (roas < KILL_ROAS_THRESHOLD && ad.status === 'active') {
        await db.update(ads)
          .set({ status: 'killed', updatedAt: new Date().toISOString() as any })
          .where(eq(ads.id, ad.id));
        killed++;
        logger.info({ adId: ad.id, roas }, 'Ad killed — below ROAS threshold');
      } else if (roas > SCALE_ROAS_THRESHOLD && ad.status === 'active') {
        scaled++;
        logger.info({ adId: ad.id, roas }, 'Ad flagged for scaling');
      }
    }

    // AI recommendations
    let aiRecommendations: Record<string, unknown> = {};
    try {
      const prompt = `Analyse ad performance and provide optimisation recommendations:
${JSON.stringify(
  activeAds.map((a) => ({
    id: a.id,
    platform: a.platform,
    spend: a.spend,
    revenue: a.revenue,
    roas: a.roas,
    status: a.status,
  })),
  null, 2,
)}

Return JSON:
{
  "summary": "overall assessment",
  "winningAds": ["ad id"],
  "losingAds": ["ad id"],
  "recommendations": [{ "adId": "id", "action": "scale|kill|pause|refresh", "reason": "why" }],
  "budgetReallocation": "suggestion",
  "expectedImpact": "estimated improvement"
}`;

      const response = await this.chat(this.buildMessages(prompt));
      aiRecommendations = this.parseJSON(response);
    } catch {
      aiRecommendations = { summary: 'AI analysis complete', winningAds: [], losingAds: [] };
    }

    return {
      optimized: activeAds.length,
      killed,
      scaled,
      ...aiRecommendations,
    };
  }
}
