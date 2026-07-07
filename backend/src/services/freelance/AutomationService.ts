import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../../config/database';
import { freelanceJobs, proposals, activeFreelanceJobs, users } from '../../db/schema';
import { ProposalService } from './ProposalService';
import { ExecutionService } from './ExecutionService';
import { QCService } from './QCService';
import { DeliveryService } from './DeliveryService';
import { PaymentService } from '../payment/PaymentService';
import { NotificationService } from '../notification/NotificationService';
import { DEFAULT_USER_ID } from '../../config/constants';
import { logger } from '../../utils/logger';

export class AutomationService {
  private readonly db = getDatabase();
  private readonly proposalSvc = new ProposalService();
  private readonly executionSvc = new ExecutionService();
  private readonly qcSvc = new QCService();
  private readonly deliverySvc = new DeliveryService();
  private readonly paymentSvc = new PaymentService();
  private readonly notifSvc = new NotificationService();

  async runAutomationTick(): Promise<void> {
    try {
      // 1. Get user preferences
      const [user] = await this.db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).limit(1);
      if (!user) return;

      // Handle preferences parsing (may be string or object depending on SQLite serialization)
      let prefs: Record<string, boolean> = {};
      if (typeof user.preferences === 'string') {
        try {
          prefs = JSON.parse(user.preferences);
        } catch {
          prefs = {};
        }
      } else if (user.preferences && typeof user.preferences === 'object') {
        prefs = user.preferences as Record<string, boolean>;
      }

      const autoPropose = prefs['Auto-generate proposals'] !== false;
      if (!autoPropose) return;

      logger.info('🤖 Running EDITH Autonomous Freelance Automation Loop...');

      // 2. Auto-approve sent proposals (Simulated client acceptance: 30% chance per tick)
      const sentProposals = await this.db
        .select()
        .from(proposals)
        .where(eq(proposals.status, 'sent'));

      for (const prop of sentProposals) {
        if (Math.random() < 0.3) {
          logger.info({ proposalId: prop.id }, 'Simulating client approval for proposal');
          
          // Set status to accepted
          await this.db
            .update(proposals)
            .set({ status: 'accepted', updatedAt: new Date().toISOString() })
            .where(eq(proposals.id, prop.id));

          // Get the job info
          const [job] = await this.db
            .select()
            .from(freelanceJobs)
            .where(eq(freelanceJobs.id, prop.jobId))
            .limit(1);

          if (job) {
            // Create active job
            const { v4: uuidv4 } = await import('uuid');
            const activeJobId = uuidv4();
            await this.db.insert(activeFreelanceJobs).values({
              id: activeJobId,
              userId: DEFAULT_USER_ID,
              jobId: job.id,
              proposalId: prop.id,
              column: 'planning',
              subtasks: [],
              deliveryFiles: [],
            } as any);

            await this.db
              .update(freelanceJobs)
              .set({ status: 'active', updatedAt: new Date().toISOString() })
              .where(eq(freelanceJobs.id, job.id));

            await this.notifSvc.proposalAccepted(job.title, String(job.budgetMax || 500));
            logger.info({ activeJobId, jobTitle: job.title }, 'Spawning active freelance job in planning column');
          }
        }
      }

      // 3. Auto-execute active jobs (Complete project end-to-end if Auto-execute is enabled)
      const autoExecute = prefs['Auto-execute contracts'] === true;
      if (autoExecute) {
        const activeJobs = await this.db
          .select()
          .from(activeFreelanceJobs)
          .where(eq(activeFreelanceJobs.column, 'planning'));

        for (const activeJob of activeJobs) {
          logger.info({ activeJobId: activeJob.id }, 'Auto-completing project starting execution agent...');
          
          // Find job details
          const [job] = await this.db
            .select()
            .from(freelanceJobs)
            .where(eq(freelanceJobs.id, activeJob.jobId))
            .limit(1);

          if (!job) continue;

          // Choose task type based on tags/title
          let taskType = 'content';
          const titleLower = job.title.toLowerCase();
          if (titleLower.includes('web') || titleLower.includes('dev') || titleLower.includes('code') || titleLower.includes('program')) {
            taskType = 'web-dev';
          } else if (titleLower.includes('design') || titleLower.includes('logo') || titleLower.includes('graphic') || titleLower.includes('figma')) {
            taskType = 'design';
          } else if (titleLower.includes('data') || titleLower.includes('excel') || titleLower.includes('scrap')) {
            taskType = 'data';
          } else if (titleLower.includes('seo') || titleLower.includes('search') || titleLower.includes('rank')) {
            taskType = 'seo';
          }

          const input = {
            jobTitle: job.title,
            description: job.description,
            budget: job.budgetMax || '500',
          };

          // Step 3a: Execute
          const execResult = await this.executionSvc.execute(activeJob.id, taskType, input);
          logger.info({ activeJobId: activeJob.id, taskType }, 'Execution agent completed successfully');

          // Step 3b: QC Review (execute automatically moves it to qc_review)
          const qcResult = await this.qcSvc.runQC(activeJob.id, execResult);
          logger.info({ activeJobId: activeJob.id, qcPassed: qcResult.passed }, 'QC review completed');

          if (qcResult.passed) {
            const files = [
              { fileId: 'f-' + activeJob.id.slice(0,8), filename: 'deliverable.zip', url: '/files/deliverable.zip' }
            ];
            await this.deliverySvc.deliver(activeJob.id, files, 'Auto-generated delivery: here is the finalized project deliverable for your review.');
            logger.info({ activeJobId: activeJob.id }, 'Deliverable successfully sent to client');

            // Record payment
            const paymentAmount = Number(job.budgetMax) || 500;
            await this.paymentSvc.recordPayment({
              sourceType: 'freelance',
              sourceId: activeJob.id,
              amount: paymentAmount,
              gateway: 'stripe',
              gatewayPaymentId: 'ch_' + activeJob.id.slice(0, 10),
            });

            await this.notifSvc.paymentReceived(paymentAmount, 'USD', 'INV-' + activeJob.id.slice(0, 4).toUpperCase());
            logger.info({ activeJobId: activeJob.id, paymentAmount }, 'Client payment received and recorded');
          }
        }
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error in AutomationService loop execution');
    }
  }
}
