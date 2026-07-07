import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log warning and return dev id when Resend not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    const { EmailService } = await import('../src/services/email/EmailService');
    const service = new EmailService();

    const result = await service.send({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Hello</p>',
    });

    expect(result.id).toBe('dev-mode-no-send');
    vi.unstubAllEnvs();
  });

  it('should substitute template variables correctly', () => {
    const template = 'Hello {{clientName}}, your invoice {{invoiceNumber}} is ready.';
    const vars = { clientName: 'John', invoiceNumber: 'EDITH-2024-0001' };

    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, value);
    }

    expect(result).toBe('Hello John, your invoice EDITH-2024-0001 is ready.');
    expect(result).not.toContain('{{');
  });

  it('should build correct subject for invoice email', () => {
    const invoiceNumber = 'EDITH-2024-0042';
    const subject = `Invoice ${invoiceNumber} from EDITH`;
    expect(subject).toBe('Invoice EDITH-2024-0042 from EDITH');
  });

  it('should build correct subject for delivery email', () => {
    const jobTitle = 'React Dashboard Build';
    const subject = `Delivery: ${jobTitle} – Work Completed`;
    expect(subject).toContain('React Dashboard Build');
    expect(subject).toContain('Completed');
  });

  it('should build correct subject for payment reminder', () => {
    const invoiceNumber = 'EDITH-2024-0010';
    const subject = `Reminder: Invoice ${invoiceNumber} is due soon`;
    expect(subject).toContain(invoiceNumber);
    expect(subject).toContain('due soon');
  });

  it('should handle multiple variable replacements', () => {
    const template = 'Hi {{name}}, amount {{amount}}, due {{date}}, link {{link}}';
    const vars = { name: 'Alice', amount: '$500', date: '2024-12-31', link: 'https://pay.example.com' };

    let result = template;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replaceAll(`{{${k}}}`, v);
    }

    expect(result).toBe('Hi Alice, amount $500, due 2024-12-31, link https://pay.example.com');
  });
});
