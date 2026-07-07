export interface FreelanceJob {
  id: string;
  userId: string;
  sourcePlatform: string;
  externalId: string;
  title: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  clientRating: number | null;
  deadline: Date | null;
  tags: string[];
  aiScore: number | null;
  aiInsights: AiInsights | null;
  status: 'new' | 'saved' | 'dismissed' | 'applied' | 'active' | 'completed' | 'failed';
  rawData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiInsights {
  matchScore: number;
  strengths: string[];
  concerns: string[];
  suggestedBid: number;
  estimatedDays: number;
  summary: string;
}

export interface Proposal {
  id: string;
  jobId: string;
  draftText: string;
  finalText: string | null;
  bidAmount: number | null;
  deliveryDays: number | null;
  portfolioItems: PortfolioItem[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  humanModifiedAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioItem {
  title: string;
  url: string;
  description?: string;
}

export interface ActiveJob {
  id: string;
  userId: string;
  jobId: string;
  proposalId: string | null;
  column: 'planning' | 'in_execution' | 'qc_review' | 'ready_to_deliver';
  subtasks: Subtask[];
  qcResults: QcResult | null;
  deliveryFiles: DeliveryFile[];
  deliveryMessage: string | null;
  clientRating: number | null;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subtask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done';
  assignedAgent: string;
}

export interface QcResult {
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  checkedAt: Date;
}

export interface DeliveryFile {
  fileId: string;
  filename: string;
  url: string;
}

export interface FreelanceDelivery {
  id: string;
  activeJobId: string;
  files: DeliveryFile[];
  deliveryMessage: string;
  clientResponse: string | null;
  revisionCount: number;
  createdAt: Date;
}

export interface JobScanOptions {
  domains?: string[];
  platforms?: string[];
  minBudget?: number;
  maxBudget?: number;
  keywords?: string[];
}

export interface JobScanResult {
  scanned: number;
  newJobs: number;
  duplicates: number;
  errors: number;
  jobs: FreelanceJob[];
}
