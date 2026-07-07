import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { platformAccounts, platformNotifications } from '../../db/schema';
import { PlatformAuthService } from './PlatformAuthService';
import { UpworkScraper } from './UpworkScraper';
import { FiverrScraper } from './FiverrScraper';
import { FreelancerScraper } from './FreelancerScraper';
import { logger } from '../../utils/logger';

export class PlatformIntegrationService {
  private readonly db = getDatabase();
  private readonly auth = new PlatformAuthService();
  private readonly upwork = new UpworkScraper();
  private readonly fiverr = new FiverrScraper();
  private readonly freelancer = new FreelancerScraper();

  private getScraper(platformName: string) {
    const name = platformName.toLowerCase();
    if (name === 'upwork') return this.upwork;
    if (name === 'fiverr') return this.fiverr;
    if (name === 'freelancer') return this.freelancer;
    throw new Error(`Unsupported platform: ${platformName}`);
  }

  async connectAccount(
    userId: string,
    platformName: string,
    email: string,
    passwordStr: string,
    profileUrl?: string
  ): Promise<any> {
    const encrypted = this.auth.encryptPassword(passwordStr);
    const id = uuidv4();

    const [account] = await this.db
      .insert(platformAccounts)
      .values({
        id,
        userId,
        platformName,
        email,
        encryptedPassword: encrypted,
        profileUrl: profileUrl || null,
        status: 'connected',
      })
      .returning();

    // Trigger initial sync in the background
    this.syncAccount(userId, id).catch((err) =>
      logger.error({ err, accountId: id }, 'Initial platform sync failed')
    );

    return account;
  }

  async listAccounts(userId: string): Promise<any[]> {
    return this.db
      .select()
      .from(platformAccounts)
      .where(eq(platformAccounts.userId, userId));
  }

  async updateAccount(userId: string, accountId: string, updates: any): Promise<any> {
    const data: Record<string, any> = { ...updates };
    if (updates.password) {
      data.encryptedPassword = this.auth.encryptPassword(updates.password);
      delete data.password;
    }
    data.lastSyncedAt = new Date().toISOString();

    const [updated] = await this.db
      .update(platformAccounts)
      .set(data)
      .where(and(eq(platformAccounts.id, accountId), eq(platformAccounts.userId, userId)))
      .returning();

    return updated;
  }

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    await this.db
      .delete(platformAccounts)
      .where(and(eq(platformAccounts.id, accountId), eq(platformAccounts.userId, userId)));
  }

  async testConnection(userId: string, accountId: string): Promise<boolean> {
    const [account] = await this.db
      .select()
      .from(platformAccounts)
      .where(and(eq(platformAccounts.id, accountId), eq(platformAccounts.userId, userId)))
      .limit(1);

    if (!account) throw new Error('Account not found');

    const decrypted = this.auth.decryptPassword(account.encryptedPassword);
    const scraper = this.getScraper(account.platformName);

    try {
      const success = await scraper.testConnection(account.email, decrypted);
      const newStatus = success ? 'connected' : 'error';
      await this.db
        .update(platformAccounts)
        .set({ status: newStatus, lastSyncedAt: new Date().toISOString() })
        .where(eq(platformAccounts.id, accountId));
      return success;
    } catch {
      await this.db
        .update(platformAccounts)
        .set({ status: 'error', lastSyncedAt: new Date().toISOString() })
        .where(eq(platformAccounts.id, accountId));
      return false;
    }
  }

  async syncAccount(userId: string, accountId: string): Promise<void> {
    const [account] = await this.db
      .select()
      .from(platformAccounts)
      .where(and(eq(platformAccounts.id, accountId), eq(platformAccounts.userId, userId)))
      .limit(1);

    if (!account) throw new Error('Account not found');

    // Update status to syncing
    await this.db
      .update(platformAccounts)
      .set({ status: 'syncing' })
      .where(eq(platformAccounts.id, accountId));

    try {
      const decrypted = this.auth.decryptPassword(account.encryptedPassword);
      const scraper = this.getScraper(account.platformName);
      const data = await scraper.scrape(account.email, decrypted, account.profileUrl || undefined);

      // Save notifications
      for (const n of data.notifications) {
        // Query to check if same notification exists to avoid spamming duplicates
        const existing = await this.db
          .select()
          .from(platformNotifications)
          .where(
            and(
              eq(platformNotifications.userId, userId),
              eq(platformNotifications.platformAccountId, accountId),
              eq(platformNotifications.title, n.title)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await this.db.insert(platformNotifications).values({
            id: uuidv4(),
            userId,
            platformAccountId: accountId,
            type: n.type,
            title: n.title,
            description: n.description,
            externalUrl: n.externalUrl || null,
            isRead: false,
          });
        }
      }

      // Save messages as notifications with type 'message'
      for (const m of data.messages) {
        const existing = await this.db
          .select()
          .from(platformNotifications)
          .where(
            and(
              eq(platformNotifications.userId, userId),
              eq(platformNotifications.type, 'message'),
              eq(platformNotifications.title, m.clientName),
              eq(platformNotifications.description, m.content)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await this.db.insert(platformNotifications).values({
            id: uuidv4(),
            userId,
            platformAccountId: accountId,
            type: 'message',
            title: m.clientName,
            description: m.content,
            isRead: false,
          });
        }
      }

      // Complete sync
      await this.db
        .update(platformAccounts)
        .set({ status: 'connected', lastSyncedAt: new Date().toISOString() })
        .where(eq(platformAccounts.id, accountId));

    } catch (err) {
      await this.db
        .update(platformAccounts)
        .set({ status: 'error', lastSyncedAt: new Date().toISOString() })
        .where(eq(platformAccounts.id, accountId));
      throw err;
    }
  }

  async listNotifications(userId: string): Promise<any[]> {
    return this.db
      .select()
      .from(platformNotifications)
      .where(eq(platformNotifications.userId, userId))
      .orderBy(platformNotifications.createdAt);
  }

  async listMessages(userId: string): Promise<any[]> {
    return this.db
      .select()
      .from(platformNotifications)
      .where(
        and(
          eq(platformNotifications.userId, userId),
          eq(platformNotifications.type, 'message')
        )
      )
      .orderBy(platformNotifications.createdAt);
  }

  async replyToMessage(userId: string, notificationId: string, replyText: string): Promise<any> {
    const [msg] = await this.db
      .select()
      .from(platformNotifications)
      .where(and(eq(platformNotifications.id, notificationId), eq(platformNotifications.userId, userId)))
      .limit(1);

    if (!msg) throw new Error('Message not found');

    const updatedText = `${msg.description}\n\n[Me]: ${replyText}`;

    // Update message description in-place
    const [updated] = await this.db
      .update(platformNotifications)
      .set({ description: updatedText, createdAt: new Date().toISOString() as any })
      .where(eq(platformNotifications.id, notificationId))
      .returning();

    return updated;
  }
}
