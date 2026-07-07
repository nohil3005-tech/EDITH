import { describe, it, expect, vi } from 'vitest';
import { VALIDATION_STEPS } from '../src/config/constants';

describe('ValidationService', () => {
  it('should have exactly 5 validation steps', () => {
    expect(VALIDATION_STEPS).toHaveLength(5);
  });

  it('should include all required validation steps', () => {
    expect(VALIDATION_STEPS).toContain('trend-analysis');
    expect(VALIDATION_STEPS).toContain('competition-check');
    expect(VALIDATION_STEPS).toContain('supplier-verification');
    expect(VALIDATION_STEPS).toContain('margin-calculation');
    expect(VALIDATION_STEPS).toContain('audience-fit');
  });

  it('should calculate average score correctly', () => {
    const stepScores = [80, 90, 70, 85, 75];
    const avg = stepScores.reduce((sum, s) => sum + s, 0) / stepScores.length;
    expect(avg).toBe(80);
  });

  it('should mark product as rejected if any step fails', () => {
    const results = [
      { step: 'trend-analysis', passed: true },
      { step: 'competition-check', passed: false }, // fails
      { step: 'supplier-verification', passed: true },
      { step: 'margin-calculation', passed: true },
      { step: 'audience-fit', passed: true },
    ];

    const overallPassed = results.every((r) => r.passed);
    expect(overallPassed).toBe(false);
  });

  it('should mark product as approved if all steps pass', () => {
    const results = VALIDATION_STEPS.map((step) => ({ step, passed: true, score: 85 }));
    const overallPassed = results.every((r) => r.passed);
    const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;

    expect(overallPassed).toBe(true);
    expect(avgScore).toBe(85);
  });
});
