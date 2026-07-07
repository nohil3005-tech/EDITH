import { BaseAgent } from './BaseAgent';

export class DataAgent extends BaseAgent {
  constructor() {
    super('data-analyst', {
      systemPrompt: `You are EDITH's data analysis specialist. You analyse datasets, build 
      visualisation specs, write Python/SQL analysis code, create dashboards, and produce 
      clear insight reports. You excel at finding actionable patterns in data.`,
      temperature: 0.3,
      maxTokens: 4000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { task, dataDescription, goal, format } = input;

    const prompt = `Data analysis task: ${task}

Data description: ${dataDescription}
Analysis goal: ${goal}
Output format: ${format || 'report + Python code'}

Return JSON:
{
  "insights": ["key insight 1", "key insight 2"],
  "visualizations": [
    { "type": "chart type", "title": "chart title", "x": "x axis", "y": "y axis", "description": "what it shows" }
  ],
  "pythonCode": "complete Python analysis code",
  "sqlQuery": "SQL query if applicable or null",
  "recommendations": ["recommendation 1"],
  "summary": "executive summary of findings"
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { insights: [], summary: response };
    }
  }
}
