import { createHash } from 'crypto';

/**
 * Generate a deterministic fingerprint for a scraped item
 * to detect duplicates across scraping runs.
 */
export function fingerprintJob(platform: string, externalId: string): string {
  return createHash('sha256')
    .update(`${platform}::${externalId}`)
    .digest('hex')
    .slice(0, 16);
}

export function fingerprintProduct(source: string, name: string, price: number): string {
  return createHash('sha256')
    .update(`${source}::${name}::${price}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Generate a share token for file sharing
 */
export function generateShareToken(): string {
  return createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('base64url')
    .slice(0, 32);
}

/**
 * Generate a referral code
 */
export function generateReferralCode(userId: string): string {
  return createHash('sha256')
    .update(`${userId}-${Date.now()}`)
    .digest('base64url')
    .slice(0, 8)
    .toUpperCase();
}

/**
 * Generate an invoice number like EDITH-2024-0001
 */
export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(4, '0');
  return `EDITH-${year}-${seq}`;
}
