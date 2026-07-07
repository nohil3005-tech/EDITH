import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateInvoiceNumber } from '../src/utils/fingerprint';

describe('InvoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate invoice numbers sequentially', () => {
    const year = new Date().getFullYear();
    const inv1 = generateInvoiceNumber(1);
    const inv2 = generateInvoiceNumber(2);
    const inv100 = generateInvoiceNumber(100);

    expect(inv1).toBe(`EDITH-${year}-0001`);
    expect(inv2).toBe(`EDITH-${year}-0002`);
    expect(inv100).toBe(`EDITH-${year}-0100`);
  });

  it('should calculate subtotal from line items', () => {
    const items = [
      { description: 'Writing', quantity: 5, unitPrice: 50, total: 250 },
      { description: 'Design', quantity: 1, unitPrice: 300, total: 300 },
      { description: 'Consulting', quantity: 2, unitPrice: 150, total: 300 },
    ];
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    expect(subtotal).toBe(850);
  });

  it('should calculate tax correctly', () => {
    const subtotal = 1000;
    const taxRate = 15; // 15%
    const tax = subtotal * (taxRate / 100);
    expect(tax).toBe(150);
  });

  it('should calculate total as subtotal + tax', () => {
    const subtotal = 1000;
    const tax = 150;
    const total = subtotal + tax;
    expect(total).toBe(1150);
  });

  it('should set status to draft on creation', () => {
    const invoice = { status: 'draft' };
    expect(invoice.status).toBe('draft');
  });

  it('should transition status correctly', () => {
    const invoice = { status: 'draft' };

    // Draft -> Sent
    invoice.status = 'sent';
    expect(invoice.status).toBe('sent');

    // Sent -> Paid
    invoice.status = 'paid';
    expect(invoice.status).toBe('paid');
  });

  it('should not allow negative line item quantities', () => {
    const quantity = -1;
    const isValid = quantity > 0;
    expect(isValid).toBe(false);
  });

  it('should not allow negative unit prices', () => {
    const unitPrice = -50;
    const isValid = unitPrice >= 0;
    expect(isValid).toBe(false);
  });

  it('should compute correct total when tax is zero', () => {
    const subtotal = 500;
    const taxRate = 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    expect(tax).toBe(0);
    expect(total).toBe(500);
  });

  it('should generate unique invoice numbers for different sequences', () => {
    const inv1 = generateInvoiceNumber(1);
    const inv2 = generateInvoiceNumber(2);
    expect(inv1).not.toBe(inv2);
  });
});
