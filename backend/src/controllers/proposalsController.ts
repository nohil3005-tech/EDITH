import { Response } from 'express';
import { eq, and, sql, or } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { proposals } from '../db/schema/freelance';
import { ProposalService } from '../services/freelance/ProposalService';
import { EmailService } from '../services/email/EmailService';
import { successResponse, errorResponse } from '../types/api';
import { getCurrentUserId } from '../utils/context';

const db = getDatabase();
const proposalService = new ProposalService();
const emailService = new EmailService();

export async function generateProposal(req: AuthRequest, res: Response): Promise<void> {
  const { tone, cvOption } = req.body as { tone?: string; cvOption?: string };
  const proposal = await proposalService.generate(req.params.jobId, req.user!.id, tone || 'professional', cvOption || 'full');
  res.json(successResponse(proposal));
}

export async function listProposals(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.query as { status?: string };
  const userId = getCurrentUserId();
  const { DEFAULT_USER_ID } = await import('../config/constants');
  
  let conditions = [or(eq(proposals.userId, userId), eq(proposals.userId, DEFAULT_USER_ID))];
  if (status) {
    conditions.push(eq(proposals.status, status));
  }

  const rows = await db
    .select()
    .from(proposals)
    .where(and(...conditions))
    .orderBy(sql`created_at DESC`);

  res.json(successResponse(rows));
}

export async function updateProposal(req: AuthRequest, res: Response): Promise<void> {
  const updated = await proposalService.update(req.params.id, req.body);
  res.json(successResponse(updated));
}

export async function sendProposal(req: AuthRequest, res: Response): Promise<void> {
  const { email, clientName } = req.body as { email?: string; clientName?: string };
  await proposalService.markSent(req.params.id);

  if (email) {
    await emailService.sendProposalReady(email, {
      clientName: clientName ?? 'Client',
      jobTitle: 'Your Project',
      proposalLink: `${process.env.FRONTEND_URL}/proposals/${req.params.id}`,
    });
  }

  res.json(successResponse({ sent: true }));
}
