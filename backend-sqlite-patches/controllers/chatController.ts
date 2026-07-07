/**
 * EDITH Desktop — Chat Controller (SQLite)
 */

import { Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { chatSessions, chatMessages } from '../db/schema';
import { ResponseGenerator } from '../services/chat/ResponseGenerator';
import { ContextManager } from '../services/chat/ContextManager';
import { successResponse, errorResponse } from '../types/api';
import { DEFAULT_USER_ID } from '../config/constants';

const db                = getDatabase();
const responseGenerator = new ResponseGenerator();
const contextManager    = new ContextManager();

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const { message, session_id, contextPage } = req.body as {
    message: string;
    session_id?: string;
    contextPage?: string;
  };

  if (!message?.trim()) {
    res.status(400).json(errorResponse('EMPTY_MESSAGE', 'Message cannot be empty'));
    return;
  }

  const sessionId = await contextManager.getOrCreateSession(
    DEFAULT_USER_ID,
    session_id,
    message.slice(0, 60),
    contextPage,
  );

  await contextManager.saveMessage({
    sessionId,
    userId:  DEFAULT_USER_ID,
    role:    'user',
    content: message,
  });

  const { text, responseData, commandType } = await responseGenerator.process(
    message,
    sessionId,
    DEFAULT_USER_ID,
  );

  const assistantMsg = await contextManager.saveMessage({
    sessionId,
    userId:       DEFAULT_USER_ID,
    role:         'assistant',
    content:      text,
    commandType,
    responseData: responseData as any,
  });

  res.json(successResponse({ sessionId, message: assistantMsg, text, responseData, commandType }));
}

export async function listSessions(_req: AuthRequest, res: Response): Promise<void> {
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, DEFAULT_USER_ID))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(50);

  res.json(successResponse(sessions));
}

export async function getSessionMessages(req: AuthRequest, res: Response): Promise<void> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, req.params.id))
    .limit(1);

  if (!session) { res.status(404).json(errorResponse('NOT_FOUND', 'Session not found')); return; }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, req.params.id))
    .orderBy(chatMessages.createdAt);

  res.json(successResponse({ session, messages }));
}

export async function deleteSession(req: AuthRequest, res: Response): Promise<void> {
  await db.delete(chatSessions).where(eq(chatSessions.id, req.params.id));
  res.json(successResponse({ deleted: true }));
}
