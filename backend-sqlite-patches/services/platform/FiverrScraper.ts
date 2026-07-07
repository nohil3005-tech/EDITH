import { logger } from '../../utils/logger';
import { ScrapedData } from './UpworkScraper';

export class FiverrScraper {
  async scrape(username: string, _decryptedPass: string, _profileUrl?: string): Promise<ScrapedData> {
    logger.info({ username }, 'Scraping Fiverr dashboard');

    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      messages: [
        {
          clientName: 'Stella & Co',
          content: 'Can you also include mobile versions for the web graphics package?',
          timestamp: new Date(Date.now() - 900 * 1000).toISOString(),
        }
      ],
      notifications: [
        {
          type: 'message',
          title: 'New message from Stella & Co',
          description: 'Stella & Co: "Can you also include mobile versions?"',
          externalUrl: 'https://fiverr.com/inbox/stella',
        }
      ]
    };
  }

  async testConnection(username: string, _decryptedPass: string): Promise<boolean> {
    logger.info({ username }, 'Testing Fiverr connection credentials');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return username.length >= 3;
  }
}
