import { BaseAgent } from './BaseAgent';

export class SEOAgent extends BaseAgent {
  constructor() {
    super('seo-specialist', {
      systemPrompt: `You are EDITH's SEO specialist. You perform keyword research, on-page 
      optimisation, technical SEO audits, link building strategies, and content planning. 
      You stay current with Google algorithm updates and best practices.`,
      temperature: 0.5,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { task, url, keywords, niche, competitors } = input;

    const prompt = `SEO task: ${task}

Website/URL: ${url || 'not provided'}
Target keywords: ${Array.isArray(keywords) ? keywords.join(', ') : keywords || 'to be researched'}
Niche: ${niche}
Competitors: ${Array.isArray(competitors) ? competitors.join(', ') : competitors || 'unknown'}

Return JSON:
{
  "keywordResearch": [
    { "keyword": "...", "volume": "monthly searches", "difficulty": "1-100", "intent": "informational|transactional|navigational" }
  ],
  "onPageOptimization": {
    "titleTag": "optimized title",
    "metaDescription": "optimized meta",
    "h1": "h1 suggestion",
    "contentRecommendations": ["recommendation list"]
  },
  "technicalIssues": ["issue 1"],
  "backLinkStrategy": ["strategy 1"],
  "contentCalendar": [{ "topic": "...", "keyword": "...", "priority": "high|medium|low" }],
  "estimatedTrafficGain": "X-Y visitors/month in 6 months"
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { keywordResearch: [], onPageOptimization: {}, notes: response };
    }
  }
}
