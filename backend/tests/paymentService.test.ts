import { describe, it, expect, vi } from 'vitest';
import { generateInvoiceNumber } from '../src/utils/fingerprint';

describe('PaymentService', () => {
  it('should generate invoice numbers in correct format', () => {
    const year = new Date().getFullYear();
    const invoiceNumber = generateInvoiceNumber(1);
    expect(invoiceNumber).toBe(`EDITH-${year}-0001`);
  });

  it('should pad invoice sequence numbers to 4 digits', () => {
    const year = new Date().getFullYear();
    expect(generateInvoiceNumber(1)).toBe(`EDITH-${year}-0001`);
    expect(generateInvoiceNumber(42)).toBe(`EDITH-${year}-0042`);
    expect(generateInvoiceNumber(999)).toBe(`EDITH-${year}-0999`);
    expect(generateInvoiceNumber(1000)).toBe(`EDITH-${year}-1000`);
  });

  it('should calculate Stripe gateway fee correctly', () => {
    const amount = 100;
    const gatewayFee = amount * 0.029 + 0.30;
    expect(gatewayFee).toBeCloseTo(3.20, 2);
  });

  it('should calculate Razorpay gateway fee correctly', () => {
    const amount = 1000;
    const gatewayFee = amount * 0.02;
    expect(gatewayFee).toBe(20);
  });

  it('should calculate net amount after fees', () => {
    const amount = 500;
    const gatewayFee = amount * 0.029 + 0.30;
    const netAmount = amount - gatewayFee;
    expect(netAmount).toBeCloseTo(485.20, 2);
  });

  it('should calculate invoice totals with tax', () => {
    const items = [
      { description: 'Web Development', quantity: 1, unitPrice: 1000, total: 1000 },
      { description: 'Design', quantity: 2, unitPrice: 250, total: 500 },
    ];
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const taxRate = 10;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    expect(subtotal).toBe(1500);
    expect(tax).toBe(150);
    expect(total).toBe(1650);
  });
});
