import { BaseAgent } from './BaseAgent';

export class VirtualAssistantAgent extends BaseAgent {
  constructor() {
    super('virtual-assistant', {
      systemPrompt: `You are EDITH's executive virtual assistant. You handle scheduling, 
      email drafting, research tasks, data entry, document preparation, and administrative 
      coordination. You are efficient, accurate, and proactive.`,
      temperature: 0.5,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { task, context, urgency, format } = input;

    const prompt = `Complete this VA task:

Task: ${task}
Context: ${context || 'none'}
Urgency: ${urgency || 'normal'}
Output format: ${format || 'professional document'}

Complete the task fully and return JSON:
{
  "result": "complete task output",
  "summary": "what was done",
  "followUpActions": ["action 1 if needed"],
  "timeEstimate": "X minutes actual work",
  "qualityChecks": ["check 1", "check 2"]
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { result: response, summary: 'Task completed' };
    }
  }
}
