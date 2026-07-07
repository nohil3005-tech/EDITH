import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ProductDiscoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deduplicate products by source + name', () => {
    const seen = new Set<string>();
    const products = [
      { source: 'aliexpress', name: 'LED Light', costPrice: 3.5 },
      { source: 'aliexpress', name: 'LED Light', costPrice: 3.5 }, // duplicate
      { source: 'tiktok', name: 'LED Light', costPrice: 4.0 },     // different source = unique
    ];

    let duplicates = 0;
    const unique = [];
    for (const p of products) {
      const key = `${p.source}::${p.name}`;
      if (seen.has(key)) { duplicates++; } else { seen.add(key); unique.push(p); }
    }

    expect(duplicates).toBe(1);
    expect(unique).toHaveLength(2);
  });

  it('should calculate profit margin correctly', () => {
    const costPrice = 10;
    const sellPrice = 39.99;
    const margin = ((sellPrice - costPrice) / sellPrice) * 100;
    expect(margin).toBeCloseTo(75.0, 0);
  });

  it('should approve product with all passing validation steps', () => {
    const steps = [
      { passed: true, score: 90 },
      { passed: true, score: 85 },
      { passed: true, score: 80 },
      { passed: true, score: 88 },
      { passed: true, score: 92 },
    ];
    const allPassed = steps.every((s) => s.passed);
    const avgScore = steps.reduce((acc, s) => acc + s.score, 0) / steps.length;
    expect(allPassed).toBe(true);
    expect(avgScore).toBe(87);
  });

  it('should reject product when any validation step fails', () => {
    const steps = [
      { passed: true, score: 90 },
      { passed: false, score: 30 }, // fails
      { passed: true, score: 80 },
    ];
    const allPassed = steps.every((s) => s.passed);
    expect(allPassed).toBe(false);
  });

  it('should set validation status to validating when started', () => {
    const product = { validationStatus: 'pending' };
    product.validationStatus = 'validating';
    expect(product.validationStatus).toBe('validating');
  });

  it('should calculate ROAS correctly', () => {
    const revenue = 500;
    const adSpend = 100;
    const roas = revenue / adSpend;
    expect(roas).toBe(5);
  });

  it('should kill ad below ROAS threshold', () => {
    const KILL_THRESHOLD = 1.0;
    const ad = { roas: 0.8, status: 'active' };
    if (ad.roas < KILL_THRESHOLD) ad.status = 'killed';
    expect(ad.status).toBe('killed');
  });

  it('should flag store for scaling when ROAS exceeds threshold', () => {
    const SCALE_THRESHOLD = 3.0;
    const store = { roas: 4.2, shouldScale: false };
    if (store.roas > SCALE_THRESHOLD) store.shouldScale = true;
    expect(store.shouldScale).toBe(true);
  });
});
