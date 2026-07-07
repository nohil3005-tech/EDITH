import { BaseAgent } from './BaseAgent';

export class ContentAgent extends BaseAgent {
  constructor() {
    super('content-writer', {
      systemPrompt: `You are EDITH's expert content writer. You write compelling, SEO-optimised, 
      plagiarism-free content across all niches. You adapt tone and style to match client requirements.
      Always produce ready-to-deliver content without meta-commentary.`,
      temperature: 0.8,
      maxTokens: 4000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { type, topic, keywords, wordCount, tone, audience, instructions } = input;

    const prompt = `Write ${type || 'an article'} about: "${topic}"

Requirements:
- Target keywords: ${Array.isArray(keywords) ? keywords.join(', ') : keywords || 'none'}
- Word count: approximately ${wordCount || 1000} words
- Tone: ${tone || 'professional'}
- Target audience: ${audience || 'general'}
- Special instructions: ${instructions || 'none'}

Produce the complete, polished content ready for delivery. Include a compelling title.
Return JSON: { "title": "...", "content": "...", "wordCount": number, "seoScore": number, "readabilityScore": number }`;

    const response = await this.chat(this.buildMessages(prompt));

    try {
      return this.parseJSON(response);
    } catch {
      return { title: topic as string, content: response, wordCount: response.split(' ').length };
    }
  }
}
