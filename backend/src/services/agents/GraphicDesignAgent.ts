import { BaseAgent } from './BaseAgent';

export class GraphicDesignAgent extends BaseAgent {
  constructor() {
    super('graphic-designer', {
      systemPrompt: `You are EDITH's graphic design specialist. You create detailed design briefs, 
      generate design specifications, suggest colour palettes, typography, and layout concepts. 
      You can produce SVG code for logos and simple graphics, and write Midjourney/DALL-E prompts 
      for complex visuals.`,
      temperature: 0.9,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { type, brand, style, colours, description, format } = input;

    const prompt = `Create a ${type || 'graphic design'} for the following brief:
Brand/Project: ${brand || 'unnamed'}
Style: ${style || 'modern, minimalist'}
Colours: ${Array.isArray(colours) ? colours.join(', ') : colours || 'open to suggestions'}
Description: ${description}
Output format: ${format || 'SVG'}

Return JSON:
{
  "concept": "design concept description",
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "typography": { "primary": "font name", "secondary": "font name" },
  "layoutNotes": "layout description",
  "svgCode": "SVG code if applicable or null",
  "aiImagePrompt": "detailed prompt for AI image generation",
  "deliverables": ["list of files to deliver"]
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { concept: response, aiImagePrompt: description as string };
    }
  }
}
