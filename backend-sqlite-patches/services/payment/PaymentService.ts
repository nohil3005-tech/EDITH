/**
 * EDITH Desktop — Payment Service (SQLite)
 * Same logic as web version but uses SQLite types (real instead of decimal).
 */

import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { getDatabase } from '../../config/database';
import { payments } from '../../db/schema';
import { DEFAULT_USER_ID } from '../../config/constants';
import { EarningsSummary } from '../../types/payment';
import { logger } from '../../utils/logger';

export class PaymentService {
  private readonly db = getDatabase();

  async getEarnings(period: string = '30d'): Promise<EarningsSummary> {
    const days  = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // SQLite doesn't have SUM with CASE WHEN easily in one query — use JS
    const rows = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.userId, DEFAULT_USER_ID),
          eq(payments.status, 'completed'),
          gte(payments.createdAt, since),
        ),
      );

    let totalRevenue         = 0;
    let totalFees            = 0;
    let netEarnings          = 0;
    let freelanceEarnings    = 0;
    let dropshippingEarnings = 0;

    for (const row of rows) {
      totalRevenue  += Number(row.amount);
      totalFees     += Number(row.gatewayFee) + Number(row.platformFee);
      netEarnings   += Number(row.netAmount);
      if (row.sourceType === 'freelance')    freelanceEarnings    += Number(row.netAmount);
      if (row.sourceType === 'dropshipping') dropshippingEarnings += Number(row.netAmount);
    }

    // Revenue by day — group in JS
    const byDay = new Map<string, number>();
    for (const row of rows) {
      const date = (row.createdAt as string).slice(0, 10);
      byDay.set(date, (byDay.get(date) ?? 0) + Number(row.netAmount));
    }
    const revenueByDay = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    return {
      totalRevenue,
      totalFees,
      netEarnings,
      freelanceEarnings,
      dropshippingEarnings,
      pendingPayouts: 0,
      currency: 'USD',
      period,
      revenueByDay,
    };
  }

  async getTransactions(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const rows = await this.db
      .select()
      .from(payments)
      .where(eq(payments.userId, DEFAULT_USER_ID))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    const all = await this.db
      .select()
      .from(payments)
      .where(eq(payments.userId, DEFAULT_USER_ID));

    return { rows, total: all.length };
  }

  async recordPayment(data: {
    sourceType: 'freelance' | 'dropshipping';
    sourceId: string;
    amount: number;
    gateway: string;
    gatewayPaymentId: string;
    currency?: string;
    customerEmail?: string;
    metadata?: Record<string, unknown>;
  }) {
    const { v4: uuidv4 } = await import('uuid');

    const gatewayFee = data.gateway === 'stripe'
      ? data.amount * 0.029 + 0.30
      : data.gateway === 'razorpay'
        ? data.amount * 0.02
        : 0;

    const [payment] = await this.db
      .insert(payments)
      .values({
        id:              uuidv4(),
        userId:          DEFAULT_USER_ID,
        sourceType:      data.sourceType,
        sourceId:        data.sourceId,
        amount:          data.amount,
        gatewayFee:      parseFloat(gatewayFee.toFixed(2)),
        platformFee:     0,
        netAmount:       parseFloat((data.amount - gatewayFee).toFixed(2)),
        status:          'completed',
        gateway:         data.gateway,
        gatewayPaymentId: data.gatewayPaymentId,
        currency:        data.currency ?? 'USD',
        customerEmail:   data.customerEmail ?? null,
        metadata:        data.metadata ?? {},
        completedAt:     new Date().toISOString(),
      } as any)
      .returning();

    logger.info({ paymentId: (payment as any)?.id, amount: data.amount }, 'Payment recorded');
    return payment;
  }
}
