import { Response, Request } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import { getDatabase } from '../config/database';
import { users, userWhitelist, systemSettings, notifications } from '../db/schema/users';
import { successResponse, errorResponse } from '../types/api';

const db = getDatabase();

// Helper to query settings
async function getSettingValue(key: string, defaultValue: boolean): Promise<boolean> {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return row ? !!(row.value as any)[key] : defaultValue;
}

// Helper to upsert settings
async function setSettingValue(key: string, value: boolean): Promise<void> {
  const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(systemSettings)
      .set({ value: { [key]: value } })
      .where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings)
      .values({ key, value: { [key]: value } });
  }
}

// ─── User Management ──────────────────────────────────────────

export async function listUsers(req: Request, res: Response): Promise<void> {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  res.json(successResponse(rows));
}

export async function getUsersCount(req: Request, res: Response): Promise<void> {
  const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  res.json(successResponse({ count: Number(count) }));
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const { status } = req.body as { status: 'active' | 'blocked' | 'pending' };

  const [updated] = await db.update(users)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found.'));
    return;
  }

  res.json(successResponse(updated));
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const { role } = req.body as { role: 'admin' | 'user' };

  const [updated] = await db.update(users)
    .set({ role, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found.'));
    return;
  }

  res.json(successResponse(updated));
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;

  const [deleted] = await db.delete(users)
    .where(eq(users.id, userId))
    .returning();

  if (!deleted) {
    res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found.'));
    return;
  }

  res.json(successResponse({ deleted: true, userId }));
}

// ─── Whitelist Management ─────────────────────────────────────

export async function listWhitelist(req: Request, res: Response): Promise<void> {
  const rows = await db.select().from(userWhitelist).orderBy(desc(userWhitelist.createdAt));
  res.json(successResponse(rows));
}

export async function addToWhitelist(req: Request, res: Response): Promise<void> {
  const { email, role = 'user' } = req.body as { email: string; role?: 'admin' | 'user' };

  // Check if already whitelisted
  const existing = await db.select().from(userWhitelist).where(eq(userWhitelist.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json(errorResponse('ALREADY_WHITELISTED', 'Email is already whitelisted.'));
    return;
  }

  const [inserted] = await db.insert(userWhitelist)
    .values({ email, role })
    .returning();

  res.status(201).json(successResponse(inserted));
}

export async function removeFromWhitelist(req: Request, res: Response): Promise<void> {
  const { email } = req.params;

  const [deleted] = await db.delete(userWhitelist)
    .where(eq(userWhitelist.email, email))
    .returning();

  if (!deleted) {
    res.status(404).json(errorResponse('NOT_FOUND', 'Email not found in whitelist.'));
    return;
  }

  res.json(successResponse({ deleted: true, email }));
}

// ─── Global System Settings ───────────────────────────────────

export async function getSystemSettings(req: Request, res: Response): Promise<void> {
  const autoApproveLogins = await getSettingValue('auto_approve_logins', false);
  const notifyOnNewLogin = await getSettingValue('notify_on_new_login', true);
  const allowAnyGoogleAccount = await getSettingValue('allow_any_google_account', false);

  res.json(successResponse({
    autoApproveLogins,
    notifyOnNewLogin,
    allowAnyGoogleAccount,
  }));
}

export async function updateSystemSettings(req: Request, res: Response): Promise<void> {
  const { autoApproveLogins, notifyOnNewLogin, allowAnyGoogleAccount } = req.body as {
    autoApproveLogins: boolean;
    notifyOnNewLogin: boolean;
    allowAnyGoogleAccount: boolean;
  };

  await setSettingValue('auto_approve_logins', autoApproveLogins);
  await setSettingValue('notify_on_new_login', notifyOnNewLogin);
  await setSettingValue('allow_any_google_account', allowAnyGoogleAccount);

  res.json(successResponse({
    autoApproveLogins,
    notifyOnNewLogin,
    allowAnyGoogleAccount,
  }));
}

// ─── Notifications ────────────────────────────────────────────

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  res.json(successResponse(rows));
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const [updated] = await db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id))
    .returning();

  if (!updated) {
    res.status(404).json(errorResponse('NOT_FOUND', 'Notification not found.'));
    return;
  }

  res.json(successResponse(updated));
}
