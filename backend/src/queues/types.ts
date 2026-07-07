export interface QueueJobResult {
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export interface RepeatableJobOptions {
  pattern?: string;       // cron pattern
  every?: number;         // milliseconds
  limit?: number;         // max repeats
  jobId?: string;
}
