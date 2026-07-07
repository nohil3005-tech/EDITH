import { FreelanceAgentName, DropshippingAgentName } from '../config/constants';

export type AgentName = FreelanceAgentName | DropshippingAgentName;

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enabled: boolean;
  dailyLimit: number;
  retryAttempts: number;
}

export interface AgentStatus {
  id: string;
  name: AgentName;
  displayName: string;
  category: 'freelance' | 'dropshipping';
  domain: string;
  status: 'active' | 'paused' | 'error';
  config: AgentConfig;
  stats: AgentStats;
  lastActivity: Date | null;
}

export interface AgentStats {
  totalRuns: number;
  successRate: number;
  avgDurationMs: number;
  todayRuns: number;
  errors: number;
}

export interface AgentLog {
  id: string;
  userId: string;
  agentName: string;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  durationMs: number;
  createdAt: Date;
}

export interface AgentExecuteInput {
  agentName: AgentName;
  action: string;
  input: Record<string, unknown>;
  jobId?: string;
  productId?: string;
}

export interface AgentExecuteResult {
  success: boolean;
  output: Record<string, unknown>;
  durationMs: number;
  logId: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
