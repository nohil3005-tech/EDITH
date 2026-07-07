import { getLLMClient, LLMClient } from '../../utils/llmClient';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { getDatabase } from '../../config/database';
import { agentLogs } from '../../db/schema/logs';
import { AgentConfig, AgentExecuteResult, LLMMessage } from '../../types/agent';
import { getCurrentUserId } from '../../utils/context';
import { env } from '../../config/env';

export abstract class BaseAgent {
  protected readonly llmClient: LLMClient;
  protected readonly db: ReturnType<typeof getDatabase>;
  protected readonly config: AgentConfig;
  public readonly name: string;

  constructor(name: string, config: Partial<AgentConfig> = {}) {
    this.name = name;
    this.llmClient = getLLMClient();
    this.db = getDatabase();
    this.config = {
      model: env.DEFAULT_MODEL,
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are EDITH, an expert AI assistant.',
      enabled: true,
      dailyLimit: 100,
      retryAttempts: 2,
      ...config,
    };
  }

  abstract execute(input: Record<string, unknown>): Promise<Record<string, unknown>>;

  protected async run(
    action: string,
    input: Record<string, unknown>,
    userId: string = getCurrentUserId(),
  ): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    let output: Record<string, unknown> = {};
    let error: string | null = null;

    try {
      output = await this.execute(input);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
      logger.error({ err, agent: this.name, action }, 'Agent execution failed');
    }

    const durationMs = Date.now() - startTime;

    let logId = '';
    try {
      const [log] = await this.db
        .insert(agentLogs)
        .values({
          id: uuidv4(),
          userId,
          agentName: this.name,
          action,
          input,
          output: error ? null : output,
          error,
          durationMs,
        } as any)
        .returning({ id: agentLogs.id });
      logId = log?.id ?? '';
    } catch (logErr) {
      logger.warn({ logErr }, 'Failed to save agent log');
    }

    if (error) {
      throw new Error(error);
    }

    return { success: true, output, durationMs, logId };
  }

  protected async chat(messages: LLMMessage[]): Promise<string> {
    const response = await this.llmClient.chat(messages, {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      retries: this.config.retryAttempts,
    });
    return response.content;
  }

  protected buildMessages(userPrompt: string): LLMMessage[] {
    return [
      { role: 'system', content: this.config.systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  protected parseJSON<T>(text: string): T {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean) as T;
  }
}
