import { Router, Request, Response } from 'express';
import { StripeService } from '../services/payment/StripeService';
import { logger } from '../utils/logger';

const router = Router();
const stripeService = new StripeService();

// NOTE: Raw body required for Stripe signature verification
// Must be mounted BEFORE express.json() middleware or with express.raw()
router.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    try {
      await stripeService.handleWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (err) {
      logger.error({ err }, 'Stripe webhook error');
      const message = err instanceof Error ? err.message : 'Webhook error';
      res.status(400).json({ error: message });
    }
  },
);

export default router;
