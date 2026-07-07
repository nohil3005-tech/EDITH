/**
 * EDITH Desktop — Referrals Controller (SQLite)
 */

import { Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { referrals } from '../db/schema';
import { PayoutTracker } from '../services/payment/PayoutTracker';
import { successResponse, errorResponse } from '../types/api';
import { DEFAULT_USER_ID } from '../config/constants';
import { generateReferralCode } from '../utils/fingerprint';

const db           = getDatabase();
const payoutTracker = new PayoutTracker();

export async function getReferralStats(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, DEFAULT_USER_ID));

  const totalReferrals    = rows.length;
  const completedReferrals = rows.filter((r) => r.status === 'completed').length;
  const pendingReferrals   = rows.filter((r) => r.status === 'pending').length;
  const totalCommission    = rows.reduce((s, r) => s + Number(r.commissionEarned), 0);

  const referralCode = generateReferralCode(DEFAULT_USER_ID);
  const referralLink = `http://localhost:3001/ref/${referralCode}`;

  res.json(successResponse({
    referralCode,
    referralLink,
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    totalCommissionEarned: totalCommission,
    commissionRate:        '20%',
    currency:              'USD',
  }));
}

export async function listReferrals(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, DEFAULT_USER_ID))
    .orderBy(desc(referrals.createdAt));

  res.json(successResponse(rows));
}

export async function withdrawCommission(req: AuthRequest, res: Response): Promise<void> {
  const { amount } = req.body as { amount: number };

  const rows = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, DEFAULT_USER_ID));

  const available = rows.reduce((s, r) => s + Number(r.commissionEarned), 0);

  if (amount > available) {
    res.status(400).json(errorResponse('INSUFFICIENT_COMMISSION', `Available: $${available.toFixed(2)}`));
    return;
  }

  const payout = await payoutTracker.inititatePayout({
    amount,
    sourceGateway:  'referral',
    destinationBank: 'Default Bank',
  });

  res.json(successResponse({ payout, withdrawn: amount, remaining: available - amount }));
}
