import { BaseAgent } from './BaseAgent';
import { scrapeDropshippingProducts } from '../../utils/scraper';

export class DiscoveryAgent extends BaseAgent {
  constructor() {
    super('product-discovery', {
      systemPrompt: `You are EDITH's product discovery specialist. You identify trending, 
      high-margin dropshipping products by analysing market trends, social media virality, 
      and competitive gaps. You score products on profit potential and market fit.`,
      temperature: 0.6,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { sources, categories, minMargin, limit } = input;

    // Scrape products
    const rawProducts = await scrapeDropshippingProducts(
      Array.isArray(sources) ? (sources as string[]) : ['aliexpress', 'tiktok'],
    );

    // Score with AI
    const prompt = `Analyse these ${rawProducts.length} products for dropshipping potential:
${JSON.stringify(rawProducts.slice(0, 10), null, 2)}

Criteria:
- Minimum profit margin: ${minMargin || 40}%
- Target categories: ${Array.isArray(categories) ? categories.join(', ') : categories || 'all'}
- Limit top picks: ${limit || 5}

Return JSON:
{
  "topProducts": [
    {
      "index": 0,
      "score": 85,
      "reasoning": "why this product scores well",
      "suggestedPrice": 29.99,
      "estimatedMargin": "65%",
      "targetAudience": "description",
      "winningAngles": ["angle 1"]
    }
  ],
  "marketInsights": "overall market observations",
  "avoidList": [0, 1]
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      const analysis = this.parseJSON<{ topProducts: Array<{ index: number; score: number; suggestedPrice: number; estimatedMargin: string }>; marketInsights: string }>(response);
      const enriched = analysis.topProducts.map((pick) => ({
        ...rawProducts[pick.index],
        aiScore: pick.score,
        targetSellPrice: pick.suggestedPrice,
      }));
      return { products: enriched, analysis, total: rawProducts.length };
    } catch {
      return { products: rawProducts, total: rawProducts.length };
    }
  }
}
