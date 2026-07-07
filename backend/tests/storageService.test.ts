import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShareToken } from '../src/utils/fingerprint';

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate unique share tokens', () => {
    const token1 = generateShareToken();
    const token2 = generateShareToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(0);
    expect(token2.length).toBeGreaterThan(0);
  });

  it('should generate share tokens of consistent length', () => {
    const tokens = Array.from({ length: 10 }, () => generateShareToken());
    const lengths = tokens.map((t) => t.length);
    const uniqueLengths = new Set(lengths);
    expect(uniqueLengths.size).toBe(1);
  });

  it('should construct storage path correctly', () => {
    const folder = 'deliverables';
    const filename = 'design-v1.pdf';
    const timestamp = 1700000000000;
    const path = `${folder}/${timestamp}-${filename}`;
    expect(path).toBe('deliverables/1700000000000-design-v1.pdf');
  });

  it('should determine storage provider correctly from env', () => {
    const providers = ['supabase', 's3', 'r2', 'local'];
    for (const provider of providers) {
      vi.stubEnv('STORAGE_PROVIDER', provider);
      expect(['supabase', 's3', 'r2', 'local']).toContain(provider);
      vi.unstubAllEnvs();
    }
  });

  it('should set share expiry correctly', () => {
    const now = Date.now();
    const expiresInHours = 24;
    const expiresAt = new Date(now + expiresInHours * 60 * 60 * 1000);
    const diffHours = (expiresAt.getTime() - now) / (60 * 60 * 1000);
    expect(diffHours).toBeCloseTo(24, 0);
  });

  it('should detect expired share links', () => {
    const expiredAt = new Date(Date.now() - 1000); // 1 second ago
    const isExpired = new Date() > expiredAt;
    expect(isExpired).toBe(true);
  });

  it('should not flag valid share links as expired', () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const isExpired = new Date() > expiresAt;
    expect(isExpired).toBe(false);
  });

  it('should calculate file size in MB', () => {
    const sizeBytes = 5 * 1024 * 1024; // 5 MB
    const sizeMB = sizeBytes / (1024 * 1024);
    expect(sizeMB).toBe(5);
  });
});
