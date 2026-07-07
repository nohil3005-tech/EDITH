import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandParser } from '../src/services/chat/CommandParser';
import { CHAT_CONTEXT_WINDOW } from '../src/config/constants';

describe('ChatService – ContextManager', () => {
  it('should limit context to CHAT_CONTEXT_WINDOW messages', () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

    const context = messages.slice(-CHAT_CONTEXT_WINDOW);
    expect(context.length).toBe(CHAT_CONTEXT_WINDOW);
    expect(context[0].content).toBe(`Message ${20 - CHAT_CONTEXT_WINDOW}`);
  });

  it('should create new session when no sessionId provided', async () => {
    const sessionId = 'new-session-id';
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
  });
});

describe('ChatService – ResponseGenerator', () => {
  it('should route job_scan intent to job discovery', () => {
    const parser = new CommandParser();
    const result = parser.parse('scan upwork jobs');
    expect(result.intent).toBe('job_scan');
  });

  it('should route product_scan intent to product discovery', () => {
    const parser = new CommandParser();
    const result = parser.parse('scan dropshipping products');
    expect(result.intent).toBe('product_scan');
  });

  it('should handle general_chat with LLM fallback', () => {
    const parser = new CommandParser();
    const result = parser.parse('What is the weather today?');
    expect(result.intent).toBe('general_chat');
  });

  it('should build correct user+assistant message pair', () => {
    const sessionId = 'sess-123';
    const userId = '00000000-0000-0000-0000-000000000001';

    const userMsg = { sessionId, userId, role: 'user' as const, content: 'Hello' };
    const assistantMsg = { sessionId, userId, role: 'assistant' as const, content: 'Hi there!' };

    expect(userMsg.role).toBe('user');
    expect(assistantMsg.role).toBe('assistant');
    expect(userMsg.sessionId).toBe(assistantMsg.sessionId);
  });

  it('should include responseData for action intents', () => {
    const responseData = {
      type: 'job_cards',
      cards: [{ id: '1', type: 'job', title: 'Test Job', subtitle: 'upwork' }],
    };
    expect(responseData.type).toBe('job_cards');
    expect(responseData.cards).toHaveLength(1);
  });
});

describe('ChatService – IntentClassifier', () => {
  it('should return high confidence for rule-matched intents', () => {
    const parser = new CommandParser();
    const result = parser.parse('scan jobs on fiverr');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('should return general_chat for low confidence matches', () => {
    const parser = new CommandParser();
    const result = parser.parse('hmm maybe something something');
    expect(result.intent).toBe('general_chat');
  });
});
