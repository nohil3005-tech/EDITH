import { BaseAgent } from './BaseAgent';

export class SocialMediaAgent extends BaseAgent {
  constructor() {
    super('social-media-manager', {
      systemPrompt: `You are EDITH's social media strategist. You create platform-native content 
      for LinkedIn, Twitter/X, Instagram, TikTok, and Facebook. You understand algorithms, 
      engagement optimisation, and brand voice development.`,
      temperature: 0.85,
      maxTokens: 3000,
    });
  }

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { platforms, topic, brand, tone, goal, count } = input;

    const prompt = `Create social media content for:

Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'LinkedIn, Twitter, Instagram'}
Topic: ${topic}
Brand voice: ${tone || 'professional, authentic'}
Goal: ${goal || 'engagement'}
Posts per platform: ${count || 3}

Return JSON:
{
  "posts": [
    {
      "platform": "platform name",
      "content": "post text",
      "hashtags": ["#hashtag"],
      "mediaType": "image|video|carousel|none",
      "mediaDescription": "what visual to create",
      "bestPostTime": "time suggestion",
      "estimatedReach": "description"
    }
  ],
  "contentCalendar": [{ "day": "Monday", "platform": "...", "postIndex": 0 }],
  "engagementTips": ["tip 1"],
  "analyticsToTrack": ["metric 1"]
}`;

    const response = await this.chat(this.buildMessages(prompt));
    try {
      return this.parseJSON(response);
    } catch {
      return { posts: [], notes: response };
    }
  }
}
