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
  const { email, name, supabaseId, avatarUrl } = req.body as {
    email: string;
    name?: string;
    supabaseId: string;
    avatarUrl?: string;
  };

  if (!email || !supabaseId) {
    res.status(400).json(errorResponse('BAD_REQUEST', 'Email and supabaseId are required.'));
    return;
  }

  // 1. Search for existing user matching Supabase ID
  let [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId)).limit(1);

  // 2. If not found by Supabase ID, search by Email
  if (!user) {
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (user) {
      // User existed by email, update their Supabase ID
      const [updated] = await db
        .update(users)
        .set({ supabaseId, updatedAt: new Date().toISOString() })
        .where(eq(users.id, user.id))
        .returning();
      user = updated;
    }
  }

  // 3. If still not found, check if we can adopt the default user row (maintains existing data)
  if (!user) {
    const [defaultUser] = await db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).limit(1);
    
    // If the default user still has the placeholder email, adopt it!
    if (defaultUser && defaultUser.email === 'admin@edith.local') {
      const [updated] = await db
        .update(users)
        .set({
          email,
          supabaseId,
          profile: { name: name || 'EDITH Operator', avatar: avatarUrl || null },
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, DEFAULT_USER_ID))
        .returning();
      user = updated;
    }
  }

  // 4. If still not found, create a brand-new user record
  if (!user) {
    const newId = supabaseId;
    const isOwner = email.toLowerCase() === (env.OWNER_EMAIL || '').toLowerCase();
    
    // First user is active, others are pending
    const status = isOwner ? 'active' : 'pending';
    
    const [inserted] = await db
      .insert(users)
      .values({
        id: newId,
        email,
        supabaseId,
        role: isOwner ? 'admin' : 'user',
        status,
        profile: { name: name || 'User', avatar: avatarUrl || null },
        preferences: {},
        paymentSettings: {},
        onboardingCompleted: false,
      } as any)
      .returning();
    user = inserted;
  }

  // 5. Verify status
  if (user.status === 'blocked') {
    res.status(403).json(errorResponse('BLOCKED', 'Your account has been blocked.'));
    return;
  }

  // 6. Generate backend-signed JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET || 'secret',
    { expiresIn: '30d' }
  );

  res.json(successResponse({ status: user.status, token, user }));
}


export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id || DEFAULT_USER_ID;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) { res.status(404).json(errorResponse('USER_NOT_FOUND', 'User profile not found')); return; }
  res.json(successResponse(user));
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id || DEFAULT_USER_ID;
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
    .where(eq(users.id, userId))
    .returning();

  res.json(successResponse(updated));
}

export async function updatePaymentSettings(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id || DEFAULT_USER_ID;
  const paymentSettings = req.body as Record<string, unknown>;

  const [updated] = await db
    .update(users)
    .set({ paymentSettings, updatedAt: new Date().toISOString() } as any)
    .where(eq(users.id, userId))
    .returning();

  res.json(successResponse(updated));
}

export async function completeOnboarding(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id || DEFAULT_USER_ID;
  await db
    .update(users)
    .set({ onboardingCompleted: true, updatedAt: new Date().toISOString() } as any)
    .where(eq(users.id, userId));

  res.json(successResponse({ onboardingCompleted: true }));
}

export async function exportData(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id || DEFAULT_USER_ID;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  res.setHeader('Content-Disposition', 'attachment; filename="edith-data-export.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ user, exportedAt: new Date().toISOString() }, null, 2));
}
