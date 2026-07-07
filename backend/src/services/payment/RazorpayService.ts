import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env';
import { getDatabase } from '../../config/database';
import { invoices } from '../../db/schema/payments';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { PaymentService } from './PaymentService';

export class RazorpayService {
  private readonly razorpay: Razorpay | null;
  private readonly db = getDatabase();
  private readonly paymentService = new PaymentService();

  constructor() {
    this.razorpay =
      env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
        ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
        : null;
  }

  private ensureRazorpay(): Razorpay {
    if (!this.razorpay) throw new AppError(503, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay is not configured');
    return this.razorpay;
  }

  async createOrder(invoiceId: string, currency: string = 'INR') {
    const rp = this.ensureRazorpay();

    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');

    const amountPaise = Math.round(Number(invoice.total) * 100);

    const order = await rp.orders.create({
      amount: amountPaise,
      currency,
      receipt: invoice.invoiceNumber,
      notes: { invoiceId },
    });

    return { orderId: order.id, amount: amountPaise, currency };
  }

  async handleWebhook(payload: string, signature: string): Promise<void> {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return;

    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    if (expected !== signature) {
      throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Razorpay webhook signature mismatch');
    }

    const event = JSON.parse(payload) as {
      event: string;
      payload: {
        payment: {
          entity: {
            id: string;
            order_id: string;
            amount: number;
            currency: string;
            email: string;
            notes: { invoiceId: string };
          };
        };
      };
    };

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const invoiceId = payment.notes?.invoiceId;

      if (invoiceId) {
        await this.db
          .update(invoices)
          .set({ status: 'paid', paidAt: new Date() as any })
          .where(eq(invoices.id, invoiceId));

        await this.paymentService.recordPayment({
          sourceType: 'freelance',
          sourceId: invoiceId,
          amount: payment.amount / 100,
          gateway: 'razorpay',
          gatewayPaymentId: payment.id,
          currency: payment.currency,
          customerEmail: payment.email,
        });

        logger.info({ invoiceId }, 'Razorpay payment captured');
      }
    }
  }
}
