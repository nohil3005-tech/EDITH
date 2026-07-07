/**
 * EDITH Desktop — Chat Context Manager (SQLite)
 */

import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { chatMessages, chatSessions } from '../../db/schema';
import { CHAT_CONTEXT_WINDOW } from '../../config/constants';
import { LLMMessage } from '../../types/agent';

export class ContextManager {
  private readonly db = getDatabase();

  async getContext(sessionId: string): Promise<LLMMessage[]> {
    const messages = await this.db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(CHAT_CONTEXT_WINDOW);

    return messages.reverse().map((m) => ({
      role:    m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  async saveMessage(data: {
    sessionId:    string;
    userId:       string;
    role:         'user' | 'assistant';
    content:      string;
    commandType?: string | null;
    responseData?: Record<string, unknown> | null;
  }) {
    const [msg] = await this.db
      .insert(chatMessages)
      .values({
        id:           uuidv4(),
        sessionId:    data.sessionId,
        userId:       data.userId,
        role:         data.role,
        content:      data.content,
        commandType:  data.commandType ?? null,
        responseData: data.responseData ?? null,
      } as any)
      .returning();

    // Increment session message count
    const session = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, data.sessionId))
      .limit(1);

    if (session[0]) {
      await this.db
        .update(chatSessions)
        .set({
          messageCount: (session[0].messageCount ?? 0) + 1,
          updatedAt:    new Date().toISOString(),
        } as any)
        .where(eq(chatSessions.id, data.sessionId));
    }

    return msg;
  }

  async getOrCreateSession(
    userId:       string,
    sessionId?:   string,
    title?:       string,
    contextPage?: string,
  ): Promise<string> {
    if (sessionId) {
      const [existing] = await this.db
        .select({ id: chatSessions.id })
        .from(chatSessions)
        .where(eq(chatSessions.id, sessionId))
        .limit(1);
      if (existing) return existing.id;
    }

    const newId = uuidv4();
    await this.db
      .insert(chatSessions)
      .values({
        id:           newId,
        userId,
        title:        title ?? 'New Conversation',
        contextPage:  contextPage ?? null,
        messageCount: 0,
      } as any);

    return newId;
  }
}
