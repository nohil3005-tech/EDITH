import { randomBytes } from 'crypto';

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function up to `maxAttempts` times with exponential back-off
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 500,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * Math.pow(2, attempt - 1));
      }
    }
  }
  throw lastErr;
}

/**
 * Generate a random alphanumeric string of given length
 */
export function randomString(length: number = 16): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Truncate a string to maxLength, appending ellipsis if truncated
 */
export function truncate(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Safely parse JSON, returning null on failure
 */
export function safeJsonParse<T = unknown>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Strip markdown code fences from LLM output and parse JSON
 */
export function parseLLMJson<T = unknown>(text: string): T | null {
  const clean = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();
  return safeJsonParse<T>(clean);
}

/**
 * Convert a period string (7d, 30d, 90d, 1y) to a Date representing the start
 */
export function periodToStartDate(period: string): Date {
  const now = Date.now();
  switch (period) {
    case '7d':  return new Date(now - 7  * 86_400_000);
    case '30d': return new Date(now - 30 * 86_400_000);
    case '90d': return new Date(now - 90 * 86_400_000);
    case '1y':  return new Date(now - 365 * 86_400_000);
    default:    return new Date(now - 30 * 86_400_000);
  }
}

/**
 * Format a number as currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Chunk an array into groups of `size`
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete (result as Record<string, unknown>)[key as string];
  }
  return result as Omit<T, K>;
}
