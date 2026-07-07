export interface ScrapingJobData {
  type: 'freelance' | 'dropshipping';
  platforms?: string[];
  options?: Record<string, unknown>;
}

export interface ProposalJobData {
  jobId: string;
  userId: string;
  forceRegenerate?: boolean;
}

export interface ExecutionJobData {
  activeJobId: string;
  userId: string;
  agentName: string;
  taskType: 'content' | 'design' | 'video' | 'code' | 'data' | 'seo';
  input: Record<string, unknown>;
}

export interface ValidationJobData {
  productId: string;
  userId: string;
  steps?: string[];
}

export interface AdsJobData {
  storeId: string;
  userId: string;
  platforms: string[];
  budget: number;
  creativeTypes: string[];
}

export interface EmailJobData {
  type: 'proposal' | 'invoice' | 'delivery' | 'payment-received' | 'payment-reminder';
  to: string;
  subject?: string;
  templateData: Record<string, unknown>;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export interface PaymentJobData {
  type: 'process' | 'refund' | 'payout';
  paymentId?: string;
  invoiceId?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

export interface OptimizationJobData {
  type: 'ads' | 'stores';
  storeId?: string;
}

export type QueueJobData =
  | ScrapingJobData
  | ProposalJobData
  | ExecutionJobData
  | ValidationJobData
  | AdsJobData
  | EmailJobData
  | PaymentJobData
  | OptimizationJobData;
