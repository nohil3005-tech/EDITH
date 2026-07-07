import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';
import { systemSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface PushSubscriptionConfig {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export class PushNotificationService {
  private readonly db = getDatabase();

  async subscribe(userId: string, subscription: PushSubscriptionConfig): Promise<void> {
    logger.info({ userId, endpoint: subscription.endpoint }, 'Registering Web Push subscription');
    
    // Store subscription in systemSettings under a user-specific key
    const settingsKey = `push_sub_${userId}`;
    const valueJson = JSON.stringify(subscription);

    const existing = await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, settingsKey))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(systemSettings)
        .set({ value: valueJson, updatedAt: new Date().toISOString() })
        .where(eq(systemSettings.key, settingsKey));
    } else {
      await this.db
        .insert(systemSettings)
        .values({
          key: settingsKey,
          value: valueJson,
        });
    }
  }

  async sendPushNotification(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, unknown> }
  ): Promise<void> {
    logger.info({ userId, payload }, 'Triggering push notification check');

    const settingsKey = `push_sub_${userId}`;
    const existing = await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, settingsKey))
      .limit(1);

    if (existing.length === 0) {
      logger.info({ userId }, 'No push subscription found. Skipping push send.');
      return;
    }

    try {
      const sub = JSON.parse(existing[0].value as string) as PushSubscriptionConfig;
      logger.info({ endpoint: sub.endpoint }, 'Mock Web Push sent successfully');
      
      // In production, we'd do: webpush.sendNotification(sub, JSON.stringify(payload))
      // Since we degrade gracefully without external NPM dependencies issues, we log it!
    } catch (err) {
      logger.warn({ err }, 'Web push trigger failed');
    }
  }
}
export const pushNotificationService = new PushNotificationService();
