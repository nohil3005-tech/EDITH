import { BaseAgent } from './BaseAgent';

export class StoreBuilderAgent extends BaseAgent {
  constructor() {
    super('store-builder', {
      systemPrompt: `You are EDITH's store building specialist. You design complete branded 
      dropshipping stores with compelling names, taglines, product pages, email sequences, 
      and conversion-optimised layouts.`,
      temperature: 0.8,
      maxTokens: 4000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { product, targetAudience, platform, budget, style } = input;

    const prompt = `Build a complete dropshipping store for:
Product: ${JSON.stringify(product)}
Target audience: ${targetAudience || 'general consumers'}
Platform: ${platform || 'Shopify'}
Budget/tier: ${budget || 'starter'}
Style preference: ${style || 'modern, trustworthy'}

Return JSON:
{
  "storeName": "store name",
  "domain": "suggested-domain.com",
  "tagline": "compelling tagline",
  "colorPalette": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" },
  "logo": { "concept": "logo description", "style": "minimal|bold|playful" },
  "productPage": {
    "title": "optimized product title",
    "description": "full HTML description",
    "images": ["image concept 1"],
    "price": 0,
    "compareAtPrice": 0,
    "bulletPoints": ["• benefit"],
    "faqSection": [{ "q": "question", "a": "answer" }]
  },
  "emailSequence": [
    { "trigger": "abandoned cart", "subject": "...", "preview": "..." }
  ],
  "trustSignals": ["trust element 1"],
  "upsells": ["upsell opportunity"],
  "estimatedSetupTime": "X hours",
  "launchChecklist": ["item 1"]
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { storeName: 'New Store', notes: response };
    }
  }
}
