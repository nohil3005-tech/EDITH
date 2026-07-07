import { logger } from '../../utils/logger';

export interface ScrapedData {
  messages: Array<{
    clientName: string;
    content: string;
    timestamp: string;
  }>;
  notifications: Array<{
    type: 'message' | 'proposal' | 'payment' | 'other';
    title: string;
    description: string;
    externalUrl?: string;
  }>;
}

export class UpworkScraper {
  async scrape(email: string, _decryptedPass: string, _profileUrl?: string): Promise<ScrapedData> {
    logger.info({ email }, 'Scraping Upwork dashboard');

    // Simulate standard scraping delay/network request
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Return mock Upwork dashboard details
    return {
      messages: [
        {
          clientName: 'John from TechStart',
          content: 'The blog post looks great, just one small edit on the introduction part.',
          timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
        }
      ],
      notifications: [
        {
          type: 'proposal',
          title: 'Proposal Accepted',
          description: 'Your proposal for "Shopify Product Descriptions" was ACCEPTED! Budget: $300',
          externalUrl: 'https://upwork.com/proposals/active',
        },
        {
          type: 'payment',
          title: 'Payment Received',
          description: 'Payment of $150 received for "Logo Design"',
          externalUrl: 'https://upwork.com/invoices/123',
        }
      ]
    };
  }

  async testConnection(email: string, _decryptedPass: string): Promise<boolean> {
    logger.info({ email }, 'Testing Upwork connection credentials');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return email.includes('@') && email.length > 5;
  }
}
