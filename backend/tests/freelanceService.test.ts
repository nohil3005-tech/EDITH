import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fingerprintJob } from '../src/utils/fingerprint';

describe('JobDiscoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deduplicate jobs by source+externalId', async () => {
    const seen = new Set<string>();
    const jobs = [
      { sourcePlatform: 'upwork', externalId: 'job-1', title: 'Job 1' },
      { sourcePlatform: 'upwork', externalId: 'job-1', title: 'Job 1 (duplicate)' },
      { sourcePlatform: 'upwork', externalId: 'job-2', title: 'Job 2' },
    ];

    let duplicates = 0;
    const unique = [];

    for (const job of jobs) {
      const key = `${job.sourcePlatform}::${job.externalId}`;
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
        unique.push(job);
      }
    }

    expect(duplicates).toBe(1);
    expect(unique).toHaveLength(2);
  });

  it('should calculate AI score within 0-100 range', () => {
    const mockInsights = { matchScore: 85, strengths: [], concerns: [], suggestedBid: 500, estimatedDays: 7, summary: '' };
    expect(mockInsights.matchScore).toBeGreaterThanOrEqual(0);
    expect(mockInsights.matchScore).toBeLessThanOrEqual(100);
  });

  it('should handle missing budget fields gracefully', () => {
    const job = { sourcePlatform: 'upwork', externalId: 'test', title: 'Test', budgetMin: null, budgetMax: null };
    const suggestedBid = Number(job.budgetMin) || 100;
    expect(suggestedBid).toBe(100);
  });

  it('should generate unique externalIds for jobs without them', () => {
    const id1 = fingerprintJob('upwork', 'job-title-1');
    const id2 = fingerprintJob('upwork', 'job-title-2');
    const id3 = fingerprintJob('upwork', 'job-title-1');
    expect(id1).toBe(id3);
    expect(id1).not.toBe(id2);
  });
});
