import { BaseAgent } from './BaseAgent';

export class VideoEditingAgent extends BaseAgent {
  constructor() {
    super('video-editor', {
      systemPrompt: `You are EDITH's video production specialist. You create detailed video editing scripts, 
      shot lists, caption scripts, B-roll suggestions, music recommendations, and colour grading notes. 
      You understand YouTube, TikTok, and Instagram formats.`,
      temperature: 0.8,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { type, duration, platform, topic, style, rawFootage } = input;

    const prompt = `Create a video editing plan for:
Type: ${type || 'YouTube video'}
Platform: ${platform || 'YouTube'}
Duration: ${duration || '5-10 minutes'}
Topic: ${topic}
Style: ${style || 'professional, engaging'}
Raw footage notes: ${rawFootage || 'standard talking head + screen record'}

Return JSON:
{
  "editingScript": [
    { "timestamp": "0:00-0:15", "action": "edit action", "notes": "notes" }
  ],
  "captionScript": "full caption text",
  "bRollSuggestions": ["suggestion list"],
  "musicRecommendations": [{ "track": "name", "mood": "mood", "license": "license type" }],
  "colorGradingNotes": "grading instructions",
  "thumbnailConcept": "thumbnail description",
  "exportSettings": { "resolution": "1920x1080", "fps": 30, "format": "MP4", "codec": "H.264" },
  "estimatedEditTime": "X hours"
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { editingScript: [], captionScript: response };
    }
  }
}
