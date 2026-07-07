import { BaseAgent } from './BaseAgent';

export class TranslationAgent extends BaseAgent {
  constructor() {
    super('translator', {
      systemPrompt: `You are EDITH's expert multilingual translator. You provide accurate, 
      culturally-appropriate translations that preserve meaning, tone, and nuance. 
      You handle technical, legal, marketing, and creative content across 50+ languages.`,
      temperature: 0.3,
      maxTokens: 4000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { text, sourceLang, targetLang, context, style } = input;

    const prompt = `Translate the following text:

Source language: ${sourceLang || 'auto-detect'}
Target language: ${targetLang}
Context: ${context || 'general'}
Style/tone to maintain: ${style || 'original'}

Text to translate:
"""
${text}
"""

Return JSON:
{
  "translation": "translated text",
  "detectedSourceLanguage": "detected language",
  "confidence": 0.95,
  "alternativeTranslations": ["alternative 1 if relevant"],
  "culturalNotes": "any cultural adaptation notes",
  "wordCount": { "source": 0, "translated": 0 }
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { translation: response, detectedSourceLanguage: sourceLang as string };
    }
  }
}
