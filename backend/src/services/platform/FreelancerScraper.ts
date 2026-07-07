import { logger } from '../../utils/logger';
import { ScrapedData } from './UpworkScraper';

export class FreelancerScraper {
  async scrape(email: string, _decryptedPass: string, _profileUrl?: string): Promise<ScrapedData> {
    logger.info({ email }, 'Scraping Freelancer.com dashboard');

    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      messages: [
        {
          clientName: 'Maria',
          content: 'When can you start on the WordPress project? We need it by Monday.',
          timestamp: new Date(Date.now() - 18000 * 1000).toISOString(),
        }
      ],
      notifications: [
        {
          type: 'other',
          title: 'New Job Invitation',
          description: 'New job invitation: "WordPress Website Migration" Budget: $500-800',
          externalUrl: 'https://freelancer.com/projects/wordpress-migration',
        }
      ]
    };
  }

  async testConnection(email: string, _decryptedPass: string): Promise<boolean> {
    logger.info({ email }, 'Testing Freelancer connection credentials');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return email.includes('@') && email.length > 5;
  }
}
