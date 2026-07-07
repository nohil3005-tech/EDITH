import { describe, it, expect, vi } from 'vitest';
import {
  sleep, withRetry, randomString, truncate,
  safeJsonParse, parseLLMJson, periodToStartDate,
  formatCurrency, clamp, chunk, pick, omit,
} from '../src/utils/helpers';

describe('helpers – sleep', () => {
  it('should resolve after the given delay', async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});

describe('helpers – withRetry', () => {
  it('should return value on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 3);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and eventually succeed', async () => {
    let calls = 0;
    const fn = async () => { calls++; if (calls < 3) throw new Error('fail'); return 'success'; };
    const result = await withRetry(fn, 3, 10);
    expect(result).toBe('success');
    expect(calls).toBe(3);
  });

  it('should throw after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, 2, 10)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('helpers – randomString', () => {
  it('should return string of correct length', () => {
    expect(randomString(16).length).toBe(16);
    expect(randomString(8).length).toBe(8);
    expect(randomString(32).length).toBe(32);
  });

  it('should return different values each time', () => {
    expect(randomString(16)).not.toBe(randomString(16));
  });
});

describe('helpers – truncate', () => {
  it('should not truncate short strings', () => {
    expect(truncate('hello', 200)).toBe('hello');
  });

  it('should truncate long strings with ellipsis', () => {
    const result = truncate('a'.repeat(300), 100);
    expect(result.length).toBe(100);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('helpers – safeJsonParse', () => {
  it('should parse valid JSON', () => {
    expect(safeJsonParse<{ a: number }>('{"a":1}')?.a).toBe(1);
  });

  it('should return null for invalid JSON', () => {
    expect(safeJsonParse('not json')).toBeNull();
  });
});

describe('helpers – parseLLMJson', () => {
  it('should strip markdown code fences', () => {
    const input = '```json\n{"score": 85}\n```';
    const result = parseLLMJson<{ score: number }>(input);
    expect(result?.score).toBe(85);
  });

  it('should return null for unparseable text', () => {
    expect(parseLLMJson('just text')).toBeNull();
  });
});

describe('helpers – periodToStartDate', () => {
  it('should return correct date for 7d', () => {
    const d = periodToStartDate('7d');
    const diffDays = (Date.now() - d.getTime()) / 86_400_000;
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it('should default to 30d for unknown periods', () => {
    const d = periodToStartDate('unknown');
    const diffDays = (Date.now() - d.getTime()) / 86_400_000;
    expect(diffDays).toBeCloseTo(30, 0);
  });
});

describe('helpers – formatCurrency', () => {
  it('should format USD correctly', () => {
    expect(formatCurrency(1234.5, 'USD')).toContain('1,234.50');
  });
});

describe('helpers – clamp', () => {
  it('should clamp value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('helpers – chunk', () => {
  it('should split array into chunks', () => {
    const result = chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should return single chunk when size >= array length', () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });
});

describe('helpers – pick', () => {
  it('should pick specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
});

describe('helpers – omit', () => {
  it('should omit specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });
});
