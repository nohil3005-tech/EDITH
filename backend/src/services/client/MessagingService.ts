import { EmailService } from '../email/EmailService';
import { logger } from '../../utils/logger';

export class MessagingService {
  private readonly email = new EmailService();

  async notifyDelivery(
    clientEmail: string,
    clientName: string,
    jobTitle: string,
    deliveryMessage: string,
    downloadLink?: string,
  ) {
    try {
      await this.email.sendDelivery(clientEmail, { clientName, jobTitle, deliveryMessage, downloadLink });
      logger.info({ clientEmail, jobTitle }, 'Delivery notification sent');
    } catch (err) {
      logger.error({ err, clientEmail }, 'Failed to send delivery notification');
    }
  }

  async notifyPaymentReceived(
    clientEmail: string,
    clientName: string,
    amount: string,
    invoiceNumber: string,
  ) {
    try {
      await this.email.sendPaymentReceived(clientEmail, { clientName, amount, invoiceNumber });
    } catch (err) {
      logger.error({ err, clientEmail }, 'Failed to send payment received notification');
    }
  }

  async sendReminder(
    clientEmail: string,
    clientName: string,
    invoiceNumber: string,
    total: string,
    dueDate: string,
    paymentLink: string,
  ) {
    try {
      await this.email.sendPaymentReminder(clientEmail, { clientName, invoiceNumber, total, dueDate, paymentLink });
    } catch (err) {
      logger.error({ err, clientEmail }, 'Failed to send payment reminder');
    }
  }
}
