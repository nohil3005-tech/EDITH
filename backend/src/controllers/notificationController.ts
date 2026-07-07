import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pushNotificationService } from '../services/notification/PushNotificationService';
import { getDatabase } from '../config/database';
import { notifications } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '../types/api';
import { getCurrentUserId } from '../utils/context';

const db = getDatabase();

export async function subscribe(req: AuthRequest, res: Response): Promise<void> {
  try {
    await pushNotificationService.subscribe(getCurrentUserId(), req.body);
    res.json(successResponse({ subscribed: true }));
  } catch (err: any) {
    res.status(500).json(errorResponse('SUBSCRIBE_FAILED', err.message));
  }
}

export async function listInAppNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, getCurrentUserId()))
      .orderBy(desc(notifications.createdAt));
    res.json(successResponse(list));
  } catch (err: any) {
    res.status(500).json(errorResponse('LIST_FAILED', err.message));
  }
}
