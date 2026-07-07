import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { join } from 'path';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  replyTo?: string;
}

export class EmailService {
  private readonly resend: Resend | null;

  constructor() {
    this.resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  async send(options: SendEmailOptions): Promise<{ id: string }> {
    if (!this.resend) {
      logger.warn({ to: options.to, subject: options.subject }, 'Email not sent – Resend not configured (dev mode)');
      return { id: 'dev-mode-no-send' };
    }

    const result = await this.resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      reply_to: options.replyTo || env.EMAIL_REPLY_TO,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType,
      })),
    });

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`);
    }

    logger.info({ to: options.to, subject: options.subject, id: result.data?.id }, 'Email sent');
    return { id: result.data?.id ?? '' };
  }

  private loadTemplate(name: string, vars: Record<string, string>): string {
    const templatePath = join(__dirname, 'templates', `${name}.html`);
    let html: string;
    try {
      html = readFileSync(templatePath, 'utf-8');
    } catch {
      html = `<p>${JSON.stringify(vars)}</p>`;
    }
    for (const [key, value] of Object.entries(vars)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }
    return html;
  }

  async sendProposalReady(to: string, vars: { clientName: string; jobTitle: string; proposalLink: string }) {
    const html = this.loadTemplate('proposal-ready', vars);
    return this.send({ to, subject: `Your proposal is ready: ${vars.jobTitle}`, html });
  }

  async sendInvoice(to: string, vars: { clientName: string; invoiceNumber: string; total: string; dueDate: string; paymentLink: string }) {
    const html = this.loadTemplate('invoice', vars);
    return this.send({ to, subject: `Invoice ${vars.invoiceNumber} from EDITH`, html });
  }

  async sendDelivery(to: string, vars: { clientName: string; jobTitle: string; deliveryMessage: string; downloadLink?: string }) {
    const html = this.loadTemplate('delivery', { ...vars, downloadLink: vars.downloadLink || '#' });
    return this.send({ to, subject: `Delivery: ${vars.jobTitle} – Work Completed`, html });
  }

  async sendPaymentReceived(to: string, vars: { clientName: string; amount: string; invoiceNumber: string }) {
    const html = this.loadTemplate('payment-received', vars);
    return this.send({ to, subject: `Payment received – ${vars.invoiceNumber}`, html });
  }

  async sendPaymentReminder(to: string, vars: { clientName: string; invoiceNumber: string; total: string; dueDate: string; paymentLink: string }) {
    const html = this.loadTemplate('payment-reminder', vars);
    return this.send({ to, subject: `Reminder: Invoice ${vars.invoiceNumber} is due soon`, html });
  }
}
