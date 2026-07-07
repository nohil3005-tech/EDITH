export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  contextPage: string | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  commandType: CommandType | null;
  responseData: ResponseData | null;
  createdAt: Date;
}

export type CommandType =
  | 'job_scan'
  | 'generate_proposal'
  | 'execute_job'
  | 'deliver_job'
  | 'product_scan'
  | 'validate_product'
  | 'build_store'
  | 'generate_ads'
  | 'optimize_ads'
  | 'create_invoice'
  | 'send_invoice'
  | 'view_analytics'
  | 'system_status'
  | 'general_chat';

export interface ResponseData {
  type: 'text' | 'job_cards' | 'product_cards' | 'invoice_preview' | 'chart' | 'agent_result' | 'store_cards';
  cards?: ResponseCard[];
  chart?: ChartData;
  preview?: Record<string, unknown>;
  agentOutput?: Record<string, unknown>;
}

export interface ResponseCard {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  amount?: number;
  currency?: string;
  actions?: CardAction[];
  metadata?: Record<string, unknown>;
}

export interface CardAction {
  label: string;
  action: string;
  variant: 'primary' | 'secondary' | 'danger';
  payload?: Record<string, unknown>;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface ParsedCommand {
  intent: CommandType;
  entities: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

export interface ChatMessageInput {
  message: string;
  sessionId?: string;
  contextPage?: string;
}
