/**
 * EDITH Desktop — Payout Tracker (SQLite)
 */

import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { payouts } from '../../db/schema';
import { DEFAULT_USER_ID } from '../../config/constants';
import { logger } from '../../utils/logger';

export class PayoutTracker {
  private readonly db = getDatabase();

  async inititatePayout(data: {
    amount: number;
    sourceGateway: string;
    destinationBank?: string;
    destinationAccountLast4?: string;
  }) {
    const [payout] = await this.db
      .insert(payouts)
      .values({
        id:                      uuidv4(),
        userId:                  DEFAULT_USER_ID,
        amount:                  data.amount,
        sourceGateway:           data.sourceGateway,
        destinationBank:         data.destinationBank ?? null,
        destinationAccountLast4: data.destinationAccountLast4 ?? null,
        status:                  'pending',
        referenceId:             `EDITH-PAYOUT-${Date.now()}`,
      } as any)
      .returning();

    logger.info({ payoutId: (payout as any)?.id, amount: data.amount }, 'Payout initiated');
    return payout;
  }

  async list() {
    return this.db
      .select()
      .from(payouts)
      .where(eq(payouts.userId, DEFAULT_USER_ID))
      .orderBy(desc(payouts.initiatedAt));
  }

  async getStats() {
    const rows = await this.db
      .select()
      .from(payouts)
      .where(eq(payouts.userId, DEFAULT_USER_ID));

    return rows.reduce((acc, row) => {
      const s = row.status;
      if (!acc[s]) acc[s] = { total: 0, count: 0 };
      acc[s].total += Number(row.amount);
      acc[s].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
  }
}
