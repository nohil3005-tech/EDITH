import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env';
import { getDatabase } from '../../config/database';
import { invoices, payments } from '../../db/schema/payments';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { PaymentService } from './PaymentService';

export class StripeService {
  private readonly stripe: Stripe | null;
  private readonly db = getDatabase();
  private readonly paymentService = new PaymentService();

  constructor() {
    this.stripe = env.STRIPE_SECRET_KEY
      ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
      : null;
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe is not configured');
    return this.stripe;
  }

  async createCheckoutSession(invoiceId: string, successUrl: string, cancelUrl: string) {
    const stripe = this.ensureStripe();

    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');

    const lineItems = (invoice.items as Array<{ description: string; quantity: number; unitPrice: number }>).map(
      (item) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.description },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.quantity,
      }),
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items:           lineItems,
      mode:                 'payment',
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      customer_email:       invoice.clientEmail,
      metadata:             { invoiceId },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const stripe  = this.ensureStripe();
    const secret  = env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature verification failed');
    }

    if (event.type === 'checkout.session.completed') {
      // Correctly type as Stripe.Checkout.Session, not AccountSession
      const session   = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId) {
        await this.db
          .update(invoices)
          .set({ status: 'paid', paidAt: new Date() as any })
          .where(eq(invoices.id, invoiceId));

        await this.paymentService.recordPayment({
          sourceType:       'freelance',
          sourceId:         invoiceId,
          amount:           (session.amount_total ?? 0) / 100,
          gateway:          'stripe',
          gatewayPaymentId: session.payment_intent as string,
          currency:         session.currency?.toUpperCase() ?? 'USD',
          customerEmail:    session.customer_email ?? undefined,
          metadata:         { sessionId: session.id },
        });

        logger.info({ invoiceId }, 'Stripe payment completed');
      }
    }
  }
}