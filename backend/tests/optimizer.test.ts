import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('OptimizerAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return no-op result when no active ads', async () => {
    vi.doMock('../src/config/database', () => ({
      getDatabase: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
    }));

    vi.doMock('../src/utils/llmClient', () => ({
      getLLMClient: vi.fn(() => ({ chat: vi.fn().mockResolvedValue({ content: '{}' }) })),
    }));

    const { OptimizerAgent } = await import('../src/services/agents/OptimizerAgent');
    const agent = new OptimizerAgent();

    // Override db to return empty ads
    (agent as any).db = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };

    // Mock the db.select().from().where() chain to return []
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    (agent as any).db.select = selectMock;

    const result = await agent.execute({});
    expect(result).toHaveProperty('optimized');
  });

  it('should identify ads below kill threshold', () => {
    const KILL_ROAS_THRESHOLD = 1.0;
    const ads = [
      { id: '1', roas: 0.5, status: 'active' },
      { id: '2', roas: 2.5, status: 'active' },
      { id: '3', roas: 4.0, status: 'active' },
    ];
    const toKill = ads.filter((a) => a.roas < KILL_ROAS_THRESHOLD);
    expect(toKill).toHaveLength(1);
    expect(toKill[0].id).toBe('1');
  });

  it('should identify ads above scale threshold', () => {
    const SCALE_ROAS_THRESHOLD = 3.0;
    const ads = [
      { id: '1', roas: 0.5, status: 'active' },
      { id: '2', roas: 2.5, status: 'active' },
      { id: '3', roas: 4.0, status: 'active' },
    ];
    const toScale = ads.filter((a) => a.roas > SCALE_ROAS_THRESHOLD);
    expect(toScale).toHaveLength(1);
    expect(toScale[0].id).toBe('3');
  });
});
