import { BaseAgent } from './BaseAgent';

export class VoiceAgent extends BaseAgent {
  constructor() {
    super('voice-over', {
      systemPrompt: `You are EDITH's voice and audio specialist. You write professional voice-over 
      scripts, podcast scripts, IVR scripts, and audio ad copy. You optimise for natural speech 
      delivery, pacing, and emotional impact.`,
      temperature: 0.7,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { type, topic, duration, tone, audience, cta } = input;

    const prompt = `Write a ${type || 'voice-over script'} for:

Topic: ${topic}
Duration: ${duration || '60 seconds'}
Tone: ${tone || 'professional, warm'}
Target audience: ${audience || 'general'}
Call to action: ${cta || 'none'}

Return JSON:
{
  "script": "full voice-over script with [PAUSE] and [EMPHASIS] markers",
  "estimatedDuration": "X seconds",
  "wordCount": 0,
  "readingSpeed": "words per minute",
  "pronunciationGuide": [{ "word": "word", "pronunciation": "how to say it" }],
  "directorNotes": "delivery notes for voice artist",
  "musicSuggestion": "background music mood/style"
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { script: response };
    }
  }
}
