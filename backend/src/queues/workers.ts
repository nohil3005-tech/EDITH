/**
 * EDITH Desktop — Inline Workers
 * Replaces all BullMQ worker files with direct service calls.
 * Jobs are processed immediately in the in-memory queue.
 */

import { getQueue } from './inMemoryQueue';
import { JobDiscoveryService } from '../services/freelance/JobDiscoveryService';
import { ProposalService } from '../services/freelance/ProposalService';
import { ExecutionService } from '../services/freelance/ExecutionService';
import { ValidationService } from '../services/dropshipping/ValidationService';
import { AdGenerationService } from '../services/dropshipping/AdGenerationService';
import { ProductDiscoveryService } from '../services/dropshipping/ProductDiscoveryService';
import { OptimizerAgent } from '../services/agents/OptimizerAgent';
import { EmailService } from '../services/email/EmailService';
import { PaymentService } from '../services/payment/PaymentService';
import { NotificationService } from '../services/notification/NotificationService';
import { AutomationService } from '../services/freelance/AutomationService';
import { getDatabase } from '../config/database';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { DEFAULT_USER_ID } from '../config/constants';

// ─── Service instances ────────────────────────────────────────
const jobDiscovery   = new JobDiscoveryService();
const proposalSvc    = new ProposalService();
const executionSvc   = new ExecutionService();
const validationSvc  = new ValidationService();
const adSvc          = new AdGenerationService();
const productSvc     = new ProductDiscoveryService();
const optimizer      = new OptimizerAgent();
const emailSvc       = new EmailService();
const paymentSvc     = new PaymentService();
const notifSvc       = new NotificationService();
const automationSvc  = new AutomationService();

export function startAllWorkers(): void {
  // ── Scraping worker ──────────────────────────────────────
  const scrapingQ = getQueue('scraping', 1);
  scrapingQ.setHandler(async (data: any) => {
    if (data.type === 'freelance') {
      const result = await jobDiscovery.scan({ platforms: data.platforms });
      
      if (result.newJobs > 0) {
        await notifSvc.jobFound(result.newJobs, data.platforms?.join(', ') ?? 'all');
      }
      
      // Run the automation tick to auto-accept proposals and complete jobs
      await automationSvc.runAutomationTick();
    } else if (data.type === 'dropshipping') {
      await productSvc.scan({ sources: data.sources });
    }
  });

  // ── Proposal worker ──────────────────────────────────────
  const proposalQ = getQueue('proposals', 3);
  proposalQ.setHandler(async (data: any) => {
    const proposal = await proposalSvc.generate(data.jobId, data.userId);
    await notifSvc.proposalGenerated('Job', data.jobId);
    return proposal;
  });

  // ── Execution workers ────────────────────────────────────
  const contentQ = getQueue('execution_content', 5);
  contentQ.setHandler(async (data: any) => {
    return executionSvc.execute(data.activeJobId, data.taskType, data.input);
  });

  const designQ = getQueue('execution_design', 3);
  designQ.setHandler(async (data: any) => {
    return executionSvc.execute(data.activeJobId, data.taskType, data.input);
  });

  const videoQ = getQueue('execution_video', 2);
  videoQ.setHandler(async (data: any) => {
    return executionSvc.execute(data.activeJobId, data.taskType, data.input);
  });

  // ── Validation worker ────────────────────────────────────
  const validationQ = getQueue('validation', 2);
  validationQ.setHandler(async (data: any) => {
    await validationSvc.startValidation(data.productId);
  });

  // ── Ads worker ───────────────────────────────────────────
  const adsQ = getQueue('ads_generation', 3);
  adsQ.setHandler(async (data: any) => {
    return adSvc.generateAds(data.storeId, {
      platforms: data.platforms,
      budget: data.budget,
      creativeTypes: data.creativeTypes,
    });
  });

  // ── Optimization worker ──────────────────────────────────
  const optimizationQ = getQueue('optimization', 1);
  optimizationQ.setHandler(async (data: any) => {
    return optimizer.execute({ storeId: data.storeId });
  });

  // ── Email worker ─────────────────────────────────────────
  const emailQ = getQueue('email', 2);
  emailQ.setHandler(async (data: any) => {
    const d = data.templateData as Record<string, string>;
    switch (data.type) {
      case 'proposal':       return emailSvc.sendProposalReady(data.to, d as any);
      case 'invoice':        return emailSvc.sendInvoice(data.to, d as any);
      case 'delivery':       return emailSvc.sendDelivery(data.to, d as any);
      case 'payment-received': return emailSvc.sendPaymentReceived(data.to, d as any);
      case 'payment-reminder': return emailSvc.sendPaymentReminder(data.to, d as any);
    }
  });

  // ── Payment worker ───────────────────────────────────────
  const paymentQ = getQueue('payment', 2);
  paymentQ.setHandler(async (data: any) => {
    if (data.type === 'process' && data.amount) {
      await notifSvc.paymentReceived(data.amount, 'USD', data.invoiceId ?? 'N/A');
    }
  });

  logger.info('✅ All in-memory workers started (desktop mode)');
}

export async function stopAllWorkers(): Promise<void> {
  logger.info('Workers stopped');
}
