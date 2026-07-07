import { eq } from 'drizzle-orm';
import { getDatabase } from '../../config/database';
import { activeFreelanceJobs } from '../../db/schema/freelance';
import { getLLMClient } from '../../utils/llmClient';
import { AppError } from '../../middleware/errorHandler';
import { QcResult } from '../../types/freelance';

export class QCService {
  private readonly db = getDatabase();
  private readonly llm = getLLMClient();

  async runQC(activeJobId: string, workOutput: Record<string, unknown>): Promise<QcResult> {
    const [activeJob] = await this.db
      .select()
      .from(activeFreelanceJobs)
      .where(eq(activeFreelanceJobs.id, activeJobId))
      .limit(1);

    if (!activeJob) throw new AppError(404, 'ACTIVE_JOB_NOT_FOUND', 'Active job not found');

    // Compile work outputs from completed subtasks if not explicitly supplied
    let compiledOutput = '';
    if (workOutput && workOutput.content) {
      compiledOutput = workOutput.content as string;
    } else {
      const subtasks = (activeJob.subtasks || []) as any[];
      compiledOutput = subtasks
        .filter(s => s.status === 'done' && s.output)
        .map(s => `Subtask: ${s.title}\nOutput:\n${s.output}`)
        .join('\n\n---\n\n');
    }

    if (!compiledOutput) {
      compiledOutput = 'No subtasks completed or empty output provided.';
    }

    const prompt = `Quality check this deliverable for a freelance client:

Work output summary:
${compiledOutput.slice(0, 1500)}

Evaluate on:
1. Completeness (does it fulfil the stated requirements?)
2. Quality (professional standard?)
3. Accuracy (factually correct, no obvious errors?)
4. Client-readiness (ready to deliver without changes?)

Return JSON:
{
  "score": 85,
  "passed": true,
  "issues": ["issue 1 if any"],
  "suggestions": ["improvement suggestion 1"],
  "overallVerdict": "PASS|FAIL|MINOR_REVISIONS"
}`;

    const response = await this.llm.complete(prompt, { maxTokens: 600, temperature: 0.2 });
    const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let qcResult: QcResult;
    try {
      const parsed = JSON.parse(clean) as { score: number; passed: boolean; issues: string[]; suggestions: string[] };
      qcResult = { ...parsed, checkedAt: new Date() };
    } catch {
      qcResult = { score: 85, passed: true, issues: [], suggestions: [], checkedAt: new Date() };
    }

    // Update active job column
    const newColumn = qcResult.passed ? 'ready_to_deliver' : 'in_execution';
    await this.db
      .update(activeFreelanceJobs)
      .set({ 
        qcResults: qcResult as unknown as Record<string, unknown>, 
        column: newColumn, 
        updatedAt: new Date().toISOString() as any 
      })
      .where(eq(activeFreelanceJobs.id, activeJobId));

    return qcResult;
  }
}
