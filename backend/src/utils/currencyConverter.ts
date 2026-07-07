import axios from 'axios';
import { logger } from './logger';

// Static fallback rates (relative to USD)
const STATIC_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  CAD: 1.36,
  AUD: 1.53,
  SGD: 1.35,
  AED: 3.67,
  JPY: 149.5,
  CNY: 7.24,
  BRL: 4.97,
  MXN: 17.15,
  KRW: 1325.0,
  CHF: 0.90,
  HKD: 7.82,
  NZD: 1.63,
  SEK: 10.42,
  NOK: 10.55,
  DKK: 6.88,
  ZAR: 18.63,
};

let ratesCache: Record<string, number> | null = null;
let cacheExpiry: number = 0;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Fetch live rates from a free API, falling back to static rates on failure.
 */
async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (ratesCache && now < cacheExpiry) return ratesCache;

  try {
    // Using exchangerate-api.com free tier (no key required for basic)
    const response = await axios.get<{ rates: Record<string, number> }>(
      'https://open.er-api.com/v6/latest/USD',
      { timeout: 5000 },
    );
    ratesCache = response.data.rates;
    cacheExpiry = now + CACHE_TTL_MS;
    logger.debug('Currency rates updated from live API');
    return ratesCache;
  } catch {
    logger.warn('Live currency API unavailable, using static rates');
    return STATIC_RATES;
  }
}

/**
 * Convert an amount from one currency to another.
 * @param amount  - Amount in source currency
 * @param from    - Source currency code (e.g. "USD")
 * @param to      - Target currency code (e.g. "EUR")
 * @returns       - Converted amount rounded to 2 decimal places
 */
export async function convertCurrency(
  amount: number,
  from: string = 'USD',
  to: string = 'USD',
): Promise<number> {
  if (from === to) return amount;

  const rates = await getRates();
  const fromRate = rates[from.toUpperCase()] ?? 1;
  const toRate = rates[to.toUpperCase()] ?? 1;

  // Convert to USD first, then to target
  const inUSD = amount / fromRate;
  const converted = inUSD * toRate;

  return Math.round(converted * 100) / 100;
}

/**
 * Get all supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(STATIC_RATES);
}

/**
 * Format amount with currency symbol
 */
export function formatAmount(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
