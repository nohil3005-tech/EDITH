import { Router, Request, Response } from 'express';
import { RazorpayService } from '../services/payment/RazorpayService';
import { logger } from '../utils/logger';

const router = Router();
const razorpayService = new RazorpayService();

router.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      return;
    }

    try {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      await razorpayService.handleWebhook(rawBody, signature);
      res.json({ received: true });
    } catch (err) {
      logger.error({ err }, 'Razorpay webhook error');
      const message = err instanceof Error ? err.message : 'Webhook error';
      res.status(400).json({ error: message });
    }
  },
);

export default router;
