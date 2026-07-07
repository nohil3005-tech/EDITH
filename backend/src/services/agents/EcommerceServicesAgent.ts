import { BaseAgent } from './BaseAgent';

export class EcommerceServicesAgent extends BaseAgent {
  constructor() {
    super('ecommerce-specialist', {
      systemPrompt: `You are EDITH's e-commerce specialist. You optimise product listings, 
      write compelling product descriptions, create Amazon/eBay/Shopify store strategies, 
      manage A+ content, and drive conversion rate optimisation.`,
      temperature: 0.7,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { task, platform, product, targetAudience, competitors } = input;

    const prompt = `E-commerce task: ${task}

Platform: ${platform || 'Shopify'}
Product: ${product}
Target audience: ${targetAudience || 'general consumers'}
Competitors: ${Array.isArray(competitors) ? competitors.join(', ') : competitors || 'unknown'}

Return JSON:
{
  "productTitle": "optimized product title",
  "description": "full HTML product description",
  "bulletPoints": ["• benefit 1", "• benefit 2"],
  "seoKeywords": ["keyword 1"],
  "pricingStrategy": "pricing recommendation",
  "conversionTips": ["tip 1"],
  "upsellOpportunities": ["product suggestion"],
  "estimatedConversionRate": "X%"
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { description: response };
    }
  }
}
