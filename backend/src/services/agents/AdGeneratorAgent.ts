import { BaseAgent } from './BaseAgent';

export class AdGeneratorAgent extends BaseAgent {
  constructor() {
    super('ad-generator', {
      systemPrompt: `You are EDITH's performance marketing specialist. You create high-converting 
      ad creatives, copy, targeting strategies, and campaign structures for Facebook, Instagram, 
      TikTok, and Google Ads. You optimise for ROAS and CPA.`,
      temperature: 0.8,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { product, store, platforms, budget, objective } = input;

    const prompt = `Create ad campaigns for:
Product: ${JSON.stringify(product)}
Store: ${JSON.stringify(store)}
Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'Facebook, Instagram'}
Daily budget: $${budget || 20}
Objective: ${objective || 'conversions'}

Return JSON:
{
  "campaigns": [
    {
      "platform": "Facebook",
      "campaignName": "name",
      "objective": "CONVERSIONS",
      "dailyBudget": 20,
      "targeting": {
        "ageRange": [18, 45],
        "interests": ["interest 1"],
        "behaviors": ["behavior 1"],
        "locations": ["US", "UK"]
      },
      "adSets": [
        {
          "name": "ad set name",
          "ads": [
            {
              "name": "ad name",
              "format": "single image|carousel|video",
              "headline": "...",
              "primaryText": "...",
              "description": "...",
              "callToAction": "SHOP_NOW",
              "imagePrompt": "AI image generation prompt",
              "hookLine": "first 3 seconds for video"
            }
          ]
        }
      ]
    }
  ],
  "estimatedCPA": "$X",
  "estimatedRoas": "X.X",
  "testingStrategy": "A/B test description",
  "scalingTrigger": "when to scale: X ROAS for Y days"
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { campaigns: [], notes: response };
    }
  }
}
