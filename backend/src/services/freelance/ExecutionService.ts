import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { activeFreelanceJobs, freelanceJobs } from '../../db/schema/freelance';
import { agentLogs } from '../../db/schema/logs';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { ContentAgent } from '../agents/ContentAgent';
import { WebDevAgent } from '../agents/WebDevAgent';
import { GraphicDesignAgent } from '../agents/GraphicDesignAgent';
import { DataAgent } from '../agents/DataAgent';
import { SEOAgent } from '../agents/SEOAgent';
import { FileManager } from '../storage/FileManager';

// Simple Mutex for thread-safe database transaction sequencing
class Mutex {
  private queue: Promise<any> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => {});
    return next;
  }
}

const AGENT_MAP: Record<string, { execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>> }> = {
  content: new ContentAgent(),
  'web-dev': new WebDevAgent(),
  design: new GraphicDesignAgent(),
  data: new DataAgent(),
  seo: new SEOAgent(),
};

export class ExecutionService {
  private readonly db = getDatabase();
  private static readonly dbMutex = new Mutex();

  async execute(activeJobId: string, taskType: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Setup subtask state inside database safely with serialized lock
    const setupResult = await ExecutionService.dbMutex.runExclusive(async () => {
      const [activeJob] = await this.db
        .select()
        .from(activeFreelanceJobs)
        .where(eq(activeFreelanceJobs.id, activeJobId))
        .limit(1);

      if (!activeJob) throw new AppError(404, 'ACTIVE_JOB_NOT_FOUND', 'Active job not found');

      const [parentJob] = await this.db
        .select()
        .from(freelanceJobs)
        .where(eq(freelanceJobs.id, activeJob.jobId))
        .limit(1);

      const subtaskId = input.subtaskId as string | undefined;
      const subtasks = (activeJob.subtasks || []) as any[];
      const subtaskIndex = subtaskId ? subtasks.findIndex(s => s.id === subtaskId) : -1;

      let actualAgentType = taskType;
      if (subtaskIndex !== -1) {
        actualAgentType = subtasks[subtaskIndex].assignedAgent || taskType;
        subtasks[subtaskIndex].status = 'in_progress';
        
        // Update DB to mark as in progress
        await this.db
          .update(activeFreelanceJobs)
          .set({ subtasks, updatedAt: new Date().toISOString() as any })
          .where(eq(activeFreelanceJobs.id, activeJobId));
      }

      return { activeJob, parentJob, subtaskId, subtasks, subtaskIndex, actualAgentType };
    });

    const { activeJob, parentJob, subtaskId, subtasks, subtaskIndex, actualAgentType } = setupResult;
    const agent = AGENT_MAP[actualAgentType] || AGENT_MAP['content'];
    if (!agent) throw new AppError(400, 'UNKNOWN_TASK_TYPE', `Unknown task type: ${actualAgentType}`);

    logger.info({ activeJobId, actualAgentType, subtaskId }, 'Starting subtask execution');
    const startTime = Date.now();

    // Map subtask/job context into agent input parameters
    let agentInput: Record<string, unknown> = { ...input };
    const subtaskTitle = subtaskIndex !== -1 ? subtasks[subtaskIndex].title : 'Generate project deliverable';

    if (actualAgentType === 'content') {
      agentInput = {
        type: 'freelance text asset',
        topic: parentJob?.title ?? 'Freelance Project',
        instructions: `Complete the task: "${subtaskTitle}". Brief: ${parentJob?.description ?? ''}`,
        keywords: parentJob?.tags ?? [],
        wordCount: 400,
        tone: 'professional',
        audience: 'client',
        ...input
      };
    } else if (actualAgentType === 'web-dev') {
      agentInput = {
        type: 'web development implementation',
        stack: 'React, TypeScript, Node.js',
        description: `Complete the task: "${subtaskTitle}". Brief: ${parentJob?.description ?? ''}`,
        requirements: parentJob?.tags ?? [],
        ...input
      };
    } else if (actualAgentType === 'design') {
      agentInput = {
        type: 'graphic design layout',
        brand: parentJob?.title ?? 'Freelance Project',
        style: 'modern, professional',
        colours: 'slate and cyan',
        description: `Complete the task: "${subtaskTitle}". Brief: ${parentJob?.description ?? ''}`,
        format: 'SVG and text specs',
        ...input
      };
    } else {
      agentInput = {
        type: 'freelance asset',
        topic: parentJob?.title ?? 'Freelance Project',
        description: `Subtask: "${subtaskTitle}". Brief: ${parentJob?.description ?? ''}`,
        ...input
      };
    }

    try {
      // Execute slow LLM call concurrently (outside the lock!)
      const result = await agent.execute(agentInput);

      // Extract generated text content
      let generatedContent = '';
      if (result.content) {
        generatedContent = result.content as string;
      } else if (result.files) {
        generatedContent = (result.files as any[]).map(f => `File: ${f.path}\n\n${f.content}`).join('\n\n---\n\n');
      } else if (result.concept) {
        generatedContent = `Concept: ${result.concept}\n\nAI Image Prompt: ${result.aiImagePrompt || 'None'}\n\nSVG Code: ${result.svgCode || 'None'}`;
      } else {
        generatedContent = JSON.stringify(result, null, 2);
      }

      // Complete and save subtask updates inside lock to prevent race conditions
      const finalResult = await ExecutionService.dbMutex.runExclusive(async () => {
        const [freshActiveJob] = await this.db
          .select()
          .from(activeFreelanceJobs)
          .where(eq(activeFreelanceJobs.id, activeJobId))
          .limit(1);

        if (!freshActiveJob) throw new AppError(404, 'ACTIVE_JOB_NOT_FOUND', 'Active job not found');
        const freshSubtasks = (freshActiveJob.subtasks || []) as any[];
        const freshSubtaskIndex = subtaskId ? freshSubtasks.findIndex(s => s.id === subtaskId) : -1;

        if (freshSubtaskIndex !== -1) {
          freshSubtasks[freshSubtaskIndex].status = 'done';
          freshSubtasks[freshSubtaskIndex].output = generatedContent;

          // Auto-save the generated subtask output as a file in the Files section
          if (generatedContent) {
            const fileManager = new FileManager();
            const buffer = Buffer.from(generatedContent, 'utf8');
            const cleanJobTitle = (parentJob?.title || 'job').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
            const cleanSubtaskTitle = freshSubtasks[freshSubtaskIndex].title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
            const filename = `${cleanJobTitle}_${cleanSubtaskTitle}.txt`;
            
            try {
              const uploadedFile = await fileManager.upload(
                buffer,
                filename,
                'text/plain',
                'Deliverables',
                ['agent-output', `job-${activeJobId}`, `subtask-${subtaskId}`]
              );
              freshSubtasks[freshSubtaskIndex].fileId = uploadedFile.id;
              logger.info({ fileId: uploadedFile.id, filename }, 'Saved agent output to Deliverables files');
            } catch (fileErr: any) {
              logger.error({ err: fileErr.message }, 'Failed to auto-save subtask output to Deliverables');
            }
          }
        }

        // Column progression logic
        let newColumn = freshActiveJob.column;
        if (freshActiveJob.column === 'planning') {
          newColumn = 'in_execution';
        }

        const allDone = freshSubtasks.length > 0 && freshSubtasks.every(s => s.status === 'done');
        if (allDone) {
          newColumn = 'qc_review';
        }

        // Update active job
        await this.db
          .update(activeFreelanceJobs)
          .set({ 
            subtasks: freshSubtasks, 
            column: newColumn, 
            updatedAt: new Date().toISOString() as any 
          })
          .where(eq(activeFreelanceJobs.id, activeJobId));

        return { newColumn, subtasks: freshSubtasks };
      });

      // Log agent execution
      await this.db.insert(agentLogs).values({
        id: uuidv4(),
        userId: activeJob.userId,
        agentName: actualAgentType,
        action: 'execute',
        input: agentInput,
        output: result,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        output: generatedContent,
        column: finalResult.newColumn,
        subtasks: finalResult.subtasks
      };
    } catch (err) {
      logger.error({ err, activeJobId, actualAgentType }, 'Execution failed');
      throw err;
    }
  }
}
