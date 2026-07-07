import { BaseAgent } from './BaseAgent';

export class WebDevAgent extends BaseAgent {
  constructor() {
    super('web-developer', {
      systemPrompt: `You are EDITH's senior web developer. You write clean, production-ready, 
      well-commented code in React, Next.js, Node.js, TypeScript, Python, and more. 
      You follow best practices, write tests, and deliver complete implementations.`,
      temperature: 0.3,
      maxTokens: 6000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { type, stack, description, requirements, existingCode } = input;

    const prompt = `Build the following: ${type || 'web feature'}

Stack: ${Array.isArray(stack) ? stack.join(', ') : stack || 'React, TypeScript, Node.js'}
Description: ${description}
Requirements:
${Array.isArray(requirements) ? requirements.map((r: unknown) => `- ${r}`).join('\n') : requirements || 'none'}
${existingCode ? `\nExisting code context:\n${existingCode}` : ''}

Produce complete, production-ready code with:
- Full implementation (no placeholders or TODOs)
- Error handling
- TypeScript types
- Inline comments for complex logic

Return JSON:
{
  "files": [
    { "path": "relative/path/to/file.ts", "content": "full file content" }
  ],
  "setupInstructions": ["step 1", "step 2"],
  "dependencies": ["package@version"],
  "testCases": ["test description 1", "test description 2"],
  "notes": "implementation notes"
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { files: [{ path: 'output.ts', content: response }], notes: 'Parsed from raw response' };
    }
  }
}
