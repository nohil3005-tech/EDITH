/**
 * EDITH Desktop — Agents Controller (SQLite)
 */

import { Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { agentLogs } from '../db/schema';
import { successResponse, errorResponse, paginationMeta } from '../types/api';
import { DEFAULT_USER_ID, FREELANCE_AGENTS, DROPSHIPPING_AGENTS } from '../config/constants';

const db = getDatabase();

const ALL_AGENTS = [
  ...FREELANCE_AGENTS.map((name) => ({ id: name, name, category: 'freelance', status: 'active' })),
  ...DROPSHIPPING_AGENTS.map((name) => ({ id: name, name, category: 'dropshipping', status: 'active' })),
];

const pausedAgents = new Set<string>();

export async function listAgents(_req: AuthRequest, res: Response): Promise<void> {
  const allLogs = await db
    .select()
    .from(agentLogs)
    .where(eq(agentLogs.userId, DEFAULT_USER_ID));

  const agentsWithStats = ALL_AGENTS.map((agent) => {
    const agentLogEntries = allLogs.filter((l) => l.agentName === agent.name);
    const totalRuns       = agentLogEntries.length;
    const errCount        = agentLogEntries.filter((l) => l.error !== null).length;
    const avgDur          = totalRuns > 0
      ? Math.round(agentLogEntries.reduce((s, l) => s + l.durationMs, 0) / totalRuns)
      : 0;
    const lastLog         = agentLogEntries.sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)))[0];

    return {
      ...agent,
      status: pausedAgents.has(agent.id) ? 'paused' : 'active',
      stats: {
        totalRuns,
        errors:        errCount,
        avgDurationMs: avgDur,
        lastRun:       lastLog ? String(lastLog.createdAt) : null,
        successRate:   totalRuns > 0 ? Math.round(((totalRuns - errCount) / totalRuns) * 100) : 100,
      },
    };
  });

  res.json(successResponse(agentsWithStats));
}

export async function getAgent(req: AuthRequest, res: Response): Promise<void> {
  const agent = ALL_AGENTS.find((a) => a.id === req.params.id);
  if (!agent) { res.status(404).json(errorResponse('NOT_FOUND', 'Agent not found')); return; }
  res.json(successResponse({ ...agent, status: pausedAgents.has(agent.id) ? 'paused' : 'active' }));
}

export async function updateAgentConfig(req: AuthRequest, res: Response): Promise<void> {
  res.json(successResponse({ updated: true, agentId: req.params.id, config: req.body }));
}

export async function getAgentLogs(req: AuthRequest, res: Response): Promise<void> {
  const page    = parseInt(String(req.query.page  ?? '1'));
  const limit   = parseInt(String(req.query.limit ?? '20'));
  const offset  = (page - 1) * limit;
  const agentId = req.params.id;

  const allLogs = await db
    .select()
    .from(agentLogs)
    .where(eq(agentLogs.userId, DEFAULT_USER_ID));

  const filtered = allLogs
    .filter((l) => l.agentName === agentId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const rows = filtered.slice(offset, offset + limit);

  res.json(successResponse(rows, paginationMeta(page, limit, filtered.length)));
}

export async function pauseAgent(req: AuthRequest, res: Response): Promise<void> {
  pausedAgents.add(req.params.id);
  res.json(successResponse({ paused: true, agentId: req.params.id }));
}

export async function resumeAgent(req: AuthRequest, res: Response): Promise<void> {
  pausedAgents.delete(req.params.id);
  res.json(successResponse({ resumed: true, agentId: req.params.id }));
}
