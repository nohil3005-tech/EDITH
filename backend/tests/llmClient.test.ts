import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('LLMClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return parsed LLM response on success', async () => {
    const mockResponse = {
      data: {
        choices: [{ message: { content: 'Hello from EDITH!' } }],
        model: 'deepseek/deepseek-chat',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      },
    };

    const createSpy = vi.spyOn(axios, 'create').mockReturnValue({
      post: vi.fn().mockResolvedValue(mockResponse),
    } as any);

    const { LLMClient } = await import('../src/utils/llmClient');
    const client = new LLMClient();

    const result = await client.chat([{ role: 'user', content: 'Hello' }]);

    expect(result.content).toBe('Hello from EDITH!');
    expect(result.model).toBe('deepseek/deepseek-chat');
    expect(result.usage.totalTokens).toBe(30);
  });

  it('should handle complete() shorthand', async () => {
    const createSpy = vi.spyOn(axios, 'create').mockReturnValue({
      post: vi.fn().mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Short answer' } }],
          model: 'deepseek/deepseek-chat',
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        },
      }),
    } as any);

    const { LLMClient } = await import('../src/utils/llmClient');
    const client = new LLMClient();
    const result = await client.complete('What is 2+2?');
    expect(result).toBe('Short answer');
  });

  it('should parse JSON from LLM responses', async () => {
    const jsonContent = '```json\n{"title": "test", "score": 95}\n```';
    const createSpy = vi.spyOn(axios, 'create').mockReturnValue({
      post: vi.fn().mockResolvedValue({
        data: {
          choices: [{ message: { content: jsonContent } }],
          model: 'deepseek/deepseek-chat',
          usage: { prompt_tokens: 5, completion_tokens: 20, total_tokens: 25 },
        },
      }),
    } as any);

    const { LLMClient } = await import('../src/utils/llmClient');
    const client = new LLMClient();
    const result = await client.complete('test');
    const clean = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);

    expect(parsed.title).toBe('test');
    expect(parsed.score).toBe(95);
  });
});
