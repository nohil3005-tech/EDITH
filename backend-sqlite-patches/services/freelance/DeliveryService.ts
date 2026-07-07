import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { activeFreelanceJobs, freelanceDeliveries, freelanceJobs } from '../../db/schema/freelance';
import { AppError } from '../../middleware/errorHandler';
import { getLLMClient } from '../../utils/llmClient';
import { FileManager } from '../storage/FileManager';

export class DeliveryService {
  private readonly db = getDatabase();
  private readonly llm = getLLMClient();

  async deliver(
    activeJobId: string,
    files: Array<{ fileId: string; filename: string; url: string }>,
    deliveryMessage?: string,
  ): Promise<typeof freelanceDeliveries.$inferSelect> {
    const [activeJob] = await this.db
      .select()
      .from(activeFreelanceJobs)
      .where(eq(activeFreelanceJobs.id, activeJobId))
      .limit(1);

    if (!activeJob) throw new AppError(404, 'ACTIVE_JOB_NOT_FOUND', 'Active job not found');
    
    // Allow delivery from ready_to_deliver stage
    if (activeJob.column !== 'ready_to_deliver') {
      throw new AppError(400, 'NOT_READY', 'Job is not in ready_to_deliver state');
    }

    const [parentJob] = await this.db
      .select()
      .from(freelanceJobs)
      .where(eq(freelanceJobs.id, activeJob.jobId))
      .limit(1);

    // Generate delivery message if not provided
    let message = deliveryMessage;
    if (!message) {
      message = await this.generateDeliveryMessage(activeJob, parentJob?.title ?? 'Freelance Project');
    }

    // Automatically package deliverables if files are empty
    let finalFiles = files || [];
    if (finalFiles.length === 0) {
      const subtasks = (activeJob.subtasks || []) as any[];
      const completedSubtasks = subtasks.filter(s => s.status === 'done' && s.output);
      
      if (completedSubtasks.length > 0) {
        const fileManager = new FileManager();
        for (const subtask of completedSubtasks) {
          // If the subtask already has a file generated during execution, use it!
          if (subtask.fileId) {
            try {
              const dbFile = await fileManager.getById(subtask.fileId);
              finalFiles.push({
                fileId: dbFile.id,
                filename: dbFile.originalName,
                url: `/api/v1/files/${dbFile.id}/download`
              });
              continue; // Skip creating a new one
            } catch (err) {
              // Fallback to upload if file was deleted
            }
          }

          const buffer = Buffer.from(subtask.output, 'utf8');
          // Create safe clean filename
          const cleanTitle = subtask.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
          const filename = `${cleanTitle || 'deliverable'}.txt`;
          try {
            const uploadedFile = await fileManager.upload(buffer, filename, 'text/plain', 'Deliverables', ['freelance-delivery']);
            finalFiles.push({
              fileId: uploadedFile.id,
              filename: uploadedFile.originalName,
              url: `/api/v1/files/${uploadedFile.id}/download`
            });
          } catch (fileErr) {
            // Log and skip file packaging errors
          }
        }
      }
    }

    const [delivery] = await this.db
      .insert(freelanceDeliveries)
      .values({
        id: uuidv4(),
        activeJobId,
        files: finalFiles,
        deliveryMessage: message,
        revisionCount: 0,
      })
      .returning();

    // Update active job with delivery info
    await this.db
      .update(activeFreelanceJobs)
      .set({
        deliveryFiles: finalFiles as unknown as Record<string, unknown>[],
        deliveryMessage: message,
        updatedAt: new Date().toISOString() as any,
      })
      .where(eq(activeFreelanceJobs.id, activeJobId));

    // Update parent freelance job status to completed
    await this.db
      .update(freelanceJobs)
      .set({ status: 'completed', updatedAt: new Date().toISOString() as any })
      .where(eq(freelanceJobs.id, activeJob.jobId));

    return delivery;
  }

  private async generateDeliveryMessage(activeJob: typeof activeFreelanceJobs.$inferSelect, projectTitle: string): Promise<string> {
    const prompt = `Write a professional delivery message for a completed freelance project: "${projectTitle}".
The deliverables are packaged and ready. Keep it concise (120 words), professional, and friendly.
Include:
- Confirmation that all tasks are successfully completed
- Note that deliverables are attached
- Invitation for feedback and revisions if required
- Friendly closing

Return only the message text, no quotes, no JSON wrapper, and no markdown tags.`;

    return await this.llm.complete(prompt, { maxTokens: 300 });
  }
}
