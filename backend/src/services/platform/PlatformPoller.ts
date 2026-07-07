import { PlatformIntegrationService } from './PlatformIntegrationService';
import { logger } from '../../utils/logger';
import { DEFAULT_USER_ID } from '../../config/constants';

export class PlatformPoller {
  private readonly service = new PlatformIntegrationService();
  private intervalId: NodeJS.Timeout | null = null;

  start(intervalMs: number = 10 * 60 * 1000) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    logger.info({ intervalMs }, 'Platform Poller background daemon initialized');
    
    // Initial sync call
    this.syncAll().catch((err) =>
      logger.error({ err }, 'Initial platform sync cycle errored')
    );
    
    this.intervalId = setInterval(() => {
      this.syncAll().catch((err) =>
        logger.error({ err }, 'Periodic platform sync cycle errored')
      );
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Platform Poller background daemon stopped');
    }
  }

  async syncAll() {
    logger.info('Polling freelance platform accounts');
    try {
      const accounts = await this.service.listAccounts(DEFAULT_USER_ID);
      for (const account of accounts) {
        try {
          await this.service.syncAccount(DEFAULT_USER_ID, account.id);
          logger.info({ accountId: account.id, platform: account.platformName }, 'Sync complete');
        } catch (err) {
          logger.error({ err, accountId: account.id }, 'Platform poller sync step failed');
        }
      }
    } catch (err) {
      logger.error({ err }, 'Listing platform accounts for poller failed');
    }
  }
}
export const platformPoller = new PlatformPoller();
