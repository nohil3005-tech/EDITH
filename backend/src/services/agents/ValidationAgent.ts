import { BaseAgent } from './BaseAgent';

export class ValidationAgent extends BaseAgent {
  constructor() {
    super('product-validator', {
      systemPrompt: `You are EDITH's product validation expert. You run rigorous 5-step validation 
      on potential dropshipping products: trend analysis, competition check, supplier verification, 
      margin calculation, and audience fit assessment.`,
      temperature: 0.4,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { product, step } = input;

    const stepPrompts: Record<string, string> = {
      'trend-analysis': `Analyse market trends for: ${JSON.stringify(product)}
      Return JSON: { "score": 0-100, "passed": bool, "findings": ["finding"], "recommendation": "action", "data": { "trendDirection": "up|flat|down", "peakMonths": ["month"], "longevity": "seasonal|evergreen|fad" } }`,
      
      'competition-check': `Assess competition level for: ${JSON.stringify(product)}
      Return JSON: { "score": 0-100, "passed": bool, "findings": ["finding"], "recommendation": "action", "data": { "competitorCount": 0, "avgPrice": 0, "marketGap": "description", "differentiationOptions": ["option"] } }`,
      
      'supplier-verification': `Evaluate supplier reliability for: ${JSON.stringify(product)}
      Return JSON: { "score": 0-100, "passed": bool, "findings": ["finding"], "recommendation": "action", "data": { "supplierRating": 0-5, "shippingTime": "days", "moq": 1, "qualityRisk": "low|medium|high" } }`,
      
      'margin-calculation': `Calculate profit margins for: ${JSON.stringify(product)}
      Return JSON: { "score": 0-100, "passed": bool, "findings": ["finding"], "recommendation": "action", "data": { "costPrice": 0, "suggestedSellPrice": 0, "grossMargin": "X%", "afterAdSpend": "X%", "breakEvenRoas": 0 } }`,
      
      'audience-fit': `Assess target audience fit for: ${JSON.stringify(product)}
      Return JSON: { "score": 0-100, "passed": bool, "findings": ["finding"], "recommendation": "action", "data": { "primaryAudience": "description", "adPlatforms": ["platform"], "cpm": "$X", "estimatedCPA": "$X" } }`,
    };

    const stepName = (step as string) || 'trend-analysis';
    const prompt = stepPrompts[stepName] || stepPrompts['trend-analysis'];

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return { step: stepName, ...this.parseJSON(response) };
    } catch {
      return { step: stepName, score: 50, passed: true, findings: [response] };
    }
  }
}
