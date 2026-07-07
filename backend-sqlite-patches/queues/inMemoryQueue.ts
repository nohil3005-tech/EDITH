/**
 * EDITH Desktop — In-Memory Job Queue
 * Replaces BullMQ + Redis with a lightweight async queue.
 * Jobs run sequentially per queue type with concurrency limits.
 * No external dependencies — works completely offline.
 */

import { logger } from '../utils/logger';

type JobHandler<T> = (data: T) => Promise<unknown>;

interface QueueJob<T> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
}

class InMemoryQueue<T = unknown> {
  private queue: QueueJob<T>[] = [];
  private running = 0;
  private handler: JobHandler<T> | null = null;
  private completedCount = 0;
  private failedCount = 0;

  constructor(
    public readonly name: string,
    private readonly concurrency: number = 1,
  ) {}

  setHandler(handler: JobHandler<T>): void {
    this.handler = handler;
  }

  async add(jobName: string, data: T, opts: { maxAttempts?: number } = {}): Promise<string> {
    const id = `${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.queue.push({ id, name: jobName, data, attempts: 0, maxAttempts: opts.maxAttempts ?? 2 });
    this.tick();
    return id;
  }

  private tick(): void {
    if (!this.handler) return;
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.running++;
      this.runJob(job).finally(() => {
        this.running--;
        this.tick();
      });
    }
  }

  private async runJob(job: QueueJob<T>): Promise<void> {
    job.attempts++;
    try {
      await this.handler!(job.data);
      this.completedCount++;
      logger.debug({ queue: this.name, job: job.name, id: job.id }, 'Job completed');
    } catch (err) {
      logger.warn({ queue: this.name, job: job.name, attempts: job.attempts, err }, 'Job failed');
      if (job.attempts < job.maxAttempts) {
        // Re-queue with delay
        setTimeout(() => {
          this.queue.push(job);
          this.tick();
        }, 2000 * job.attempts);
      } else {
        this.failedCount++;
        logger.error({ queue: this.name, job: job.name }, 'Job permanently failed after max attempts');
      }
    }
  }

  async getWaitingCount(): Promise<number> { return this.queue.length; }
  async getActiveCount(): Promise<number> { return this.running; }
  async getCompletedCount(): Promise<number> { return this.completedCount; }
  async getFailedCount(): Promise<number> { return this.failedCount; }
  async close(): Promise<void> { this.queue.length = 0; }
}

// ─── Singleton queues (replaces BullMQ queues) ────────────────
const queues = new Map<string, InMemoryQueue<any>>();

export function getQueue<T = unknown>(name: string, concurrency = 1): InMemoryQueue<T> {
  if (!queues.has(name)) {
    queues.set(name, new InMemoryQueue<T>(name, concurrency));
  }
  return queues.get(name) as InMemoryQueue<T>;
}

export function getQueues(): Map<string, InMemoryQueue> {
  return queues;
}

export async function closeAllQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}

export { InMemoryQueue };
