/**
 * EDITH Desktop — Auth Controller (SQLite)
 */

import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { users } from '../db/schema';
import { successResponse, errorResponse } from '../types/api';
import { DEFAULT_USER_ID } from '../config/constants';

const db = getDatabase();

export async function getConfig(req: AuthRequest, res: Response): Promise<void> {
  res.json(successResponse({ googleClientId: env.GOOGLE_CLIENT_ID || 'mock-id' }));
}

export async function gate1Verify(req: AuthRequest, res: Response): Promise<void> {
  const { codename } = req.body as { codename?: string };
  const masterCodename = env.GATE2_CODENAME || 'STARRY NIGHT';
  if (!codename || codename.trim().toUpperCase() !== masterCodename.trim().toUpperCase()) {
    res.status(401).json(errorResponse('ACCESS_DENIED', 'The stars do not recognize you'));
    return;
  }
  const token = jwt.sign({ gate1: true }, env.JWT_SECRET, { expiresIn: '1h' });
  res.json(successResponse({ token }));
}

export async function gate2Verify(req: AuthRequest, res: Response): Promise<void> {
  res.status(410).json(errorResponse('GONE', 'This gate is no longer active.'));
}

export async function googleLogin(req: AuthRequest, res: Response): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).limit(1);
  if (!user) {
    res.status(404).json(errorResponse('USER_NOT_FOUND', 'Default user not found'));
    return;
  }
  const token = jwt.sign({ userId: user.id, email: user.email, role: 'admin' }, env.JWT_SECRET, { expiresIn: '30d' });
  res.json(successResponse({ status: 'active', token, user }));
}


export async function getProfile(_req: AuthRequest, res: Response): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).limit(1);
  if (!user) { res.status(404).json(errorResponse('USER_NOT_FOUND', 'Default user not found')); return; }
  res.json(successResponse(user));
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const { profile, preferences } = req.body as {
    profile?: Record<string, unknown>;
    preferences?: Record<string, unknown>;
  };

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (profile)     updateData.profile     = profile;
  if (preferences) updateData.preferences = preferences;

  const [updated] = await db
    .update(users)
    .set(updateData as any)
    .where(eq(users.id, DEFAULT_USER_ID))
    .returning();

  res.json(successResponse(updated));
}

export async function updatePaymentSettings(req: AuthRequest, res: Response): Promise<void> {
  const paymentSettings = req.body as Record<string, unknown>;

  const [updated] = await db
    .update(users)
    .set({ paymentSettings, updatedAt: new Date().toISOString() } as any)
    .where(eq(users.id, DEFAULT_USER_ID))
    .returning();

  res.json(successResponse(updated));
}

export async function completeOnboarding(_req: AuthRequest, res: Response): Promise<void> {
  await db
    .update(users)
    .set({ onboardingCompleted: true, updatedAt: new Date().toISOString() } as any)
    .where(eq(users.id, DEFAULT_USER_ID));

  res.json(successResponse({ onboardingCompleted: true }));
}

export async function exportData(_req: AuthRequest, res: Response): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).limit(1);

  res.setHeader('Content-Disposition', 'attachment; filename="edith-data-export.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ user, exportedAt: new Date().toISOString() }, null, 2));
}
