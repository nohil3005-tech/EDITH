import { BaseAgent } from './BaseAgent';

export class AIConsultingAgent extends BaseAgent {
  constructor() {
    super('ai-consultant', {
      systemPrompt: `You are EDITH's AI strategy consultant. You advise businesses on AI adoption, 
      automation opportunities, AI tool selection, ROI analysis, and implementation roadmaps. 
      You combine deep technical knowledge with business acumen.`,
      temperature: 0.6,
      maxTokens: 4000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { business, challenge, budget, timeline, currentStack } = input;

    const prompt = `Provide AI consulting advice for:

Business: ${business || 'SMB'}
Challenge/Goal: ${challenge}
Budget: ${budget || 'not specified'}
Timeline: ${timeline || '3-6 months'}
Current tech stack: ${Array.isArray(currentStack) ? currentStack.join(', ') : currentStack || 'unknown'}

Return JSON:
{
  "executiveSummary": "2-3 sentence summary",
  "opportunityAreas": [
    { "area": "area name", "impact": "high|medium|low", "effort": "high|medium|low", "tools": ["tool1"] }
  ],
  "implementationRoadmap": [
    { "phase": "Phase 1", "duration": "weeks", "activities": ["activity"], "cost": "estimate" }
  ],
  "roiAnalysis": {
    "estimatedAnnualSavings": "USD amount",
    "implementationCost": "USD amount",
    "paybackPeriod": "months",
    "confidenceLevel": "high|medium|low"
  },
  "riskFactors": ["risk 1"],
  "recommendedTools": [{ "name": "tool", "purpose": "purpose", "cost": "pricing" }],
  "nextSteps": ["immediate action 1"]
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { executiveSummary: response, opportunityAreas: [] };
    }
  }
}
