import { BaseAgent } from './BaseAgent';

export class UIUXAgent extends BaseAgent {
  constructor() {
    super('ui-ux-designer', {
      systemPrompt: `You are EDITH's senior UI/UX designer. You create wireframes (described in detail), 
      user flows, component specifications, design system tokens, and Figma-ready specs. 
      You deeply understand usability, accessibility, and modern design patterns.`,
      temperature: 0.7,
      maxTokens: 4000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { projectType, platform, pages, style, userGoal, constraints } = input;

    const prompt = `Design a ${projectType || 'web application'} UI/UX for ${platform || 'web'}.

User goal: ${userGoal}
Pages/screens to design: ${Array.isArray(pages) ? pages.join(', ') : pages || 'dashboard, main view'}
Design style: ${style || 'modern, clean'}
Constraints: ${constraints || 'none'}

Return JSON:
{
  "designSystem": {
    "colors": { "primary": "#hex", "secondary": "#hex", "background": "#hex", "text": "#hex" },
    "typography": { "heading": "font", "body": "font", "mono": "font" },
    "spacing": "4px base grid",
    "borderRadius": "8px"
  },
  "wireframes": [
    { "page": "page name", "components": ["component list"], "layout": "layout description", "interactions": ["interaction list"] }
  ],
  "userFlow": ["step1", "step2"],
  "componentSpecs": [{ "name": "component", "props": {}, "behavior": "description" }],
  "accessibilityNotes": "WCAG compliance notes",
  "figmaLink": null
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { designSystem: {}, wireframes: [], userFlow: [], notes: response };
    }
  }
}
