import { eq } from 'drizzle-orm';
import { getDatabase } from '../../config/database';
import { activeFreelanceJobs, freelanceJobs, proposals, freelanceDeliveries } from '../../db/schema/freelance';
import { invoices } from '../../db/schema/payments';
import { files } from '../../db/schema/files';
import { AppError } from '../../middleware/errorHandler';

export class ClientPortalService {
  private readonly db = getDatabase();

  async getProjectView(activeJobId: string) {
    const [activeJob] = await this.db
      .select()
      .from(activeFreelanceJobs)
      .where(eq(activeFreelanceJobs.id, activeJobId))
      .limit(1);

    if (!activeJob) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');

    const [job] = await this.db
      .select({ title: freelanceJobs.title, description: freelanceJobs.description, tags: freelanceJobs.tags })
      .from(freelanceJobs)
      .where(eq(freelanceJobs.id, activeJob.jobId))
      .limit(1);

    let proposal = null;
    if (activeJob.proposalId) {
      const [p] = await this.db
        .select({ bidAmount: proposals.bidAmount, deliveryDays: proposals.deliveryDays })
        .from(proposals)
        .where(eq(proposals.id, activeJob.proposalId))
        .limit(1);
      proposal = p;
    }

    const deliveries = await this.db
      .select()
      .from(freelanceDeliveries)
      .where(eq(freelanceDeliveries.activeJobId, activeJobId));

    const relatedInvoices = await this.db
      .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, total: invoices.total, status: invoices.status, dueDate: invoices.dueDate })
      .from(invoices)
      .where(eq(invoices.userId, activeJob.userId));

    return {
      project: {
        id: activeJob.id,
        title: job?.title ?? 'Project',
        status: activeJob.column,
        description: job?.description ?? '',
        tags: job?.tags ?? [],
      },
      proposal,
      deliveries: deliveries.map((d) => ({
        id: d.id,
        message: d.deliveryMessage,
        files: d.files,
        createdAt: d.createdAt,
      })),
      invoices: relatedInvoices,
    };
  }
}
