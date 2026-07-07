/**
 * EDITH Desktop — Notification Service (SQLite)
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { activityLog } from '../../db/schema';
import { DEFAULT_USER_ID } from '../../config/constants';
import { logger } from '../../utils/logger';

export type NotificationType =
  | 'job_found' | 'proposal_generated' | 'proposal_sent' | 'job_completed'
  | 'payment_received' | 'invoice_sent' | 'product_found' | 'store_launched'
  | 'ad_killed' | 'ad_scaling' | 'system_alert';

export class NotificationService {
  private readonly db = getDatabase();

  async log(type: NotificationType, description: string, metadata: Record<string, unknown> = {}) {
    try {
      await this.db.insert(activityLog).values({
        id:          uuidv4(),
        userId:      DEFAULT_USER_ID,
        type,
        description,
        metadata,
      } as any);
    } catch (err) {
      logger.error({ err }, 'Failed to log activity');
    }
  }

  async jobFound(count: number, platform: string) {
    await this.log('job_found', `Found ${count} new jobs on ${platform}`, { count, platform });
  }

  async proposalGenerated(jobTitle: string, jobId: string) {
    await this.log('proposal_generated', `Proposal generated for: ${jobTitle}`, { jobTitle, jobId });
  }

  async paymentReceived(amount: number, currency: string, invoiceNumber: string) {
    await this.log('payment_received', `Payment received: ${currency} ${amount} (${invoiceNumber})`, {
      amount, currency, invoiceNumber,
    });
  }

  async adKilled(adId: string, roas: number) {
    await this.log('ad_killed', `Ad killed – ROAS ${roas.toFixed(2)} below threshold`, { adId, roas });
  }

  async storeStatusChange(storeId: string, storeName: string, newStatus: string) {
    await this.log('store_launched', `Store "${storeName}" status → ${newStatus}`, {
      storeId, storeName, newStatus,
    });
  }

  async proposalAccepted(jobTitle: string, budget: string) {
    await this.log('proposal_sent', `Proposal accepted for: ${jobTitle} ($${budget})`, { jobTitle, budget });
  }
}
