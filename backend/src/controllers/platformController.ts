import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PlatformIntegrationService } from '../services/platform/PlatformIntegrationService';
import { successResponse, errorResponse } from '../types/api';
import { getCurrentUserId } from '../utils/context';

const service = new PlatformIntegrationService();

export async function connectAccount(req: AuthRequest, res: Response): Promise<void> {
  const { platformName, email, password, profileUrl } = req.body as {
    platformName: string;
    email: string;
    password: string;
    profileUrl?: string;
  };

  if (!platformName || !email || !password) {
    res.status(400).json(errorResponse('MISSING_FIELDS', 'Platform, email, and password are required'));
    return;
  }

  try {
    const account = await service.connectAccount(getCurrentUserId(), platformName, email, password, profileUrl);
    res.status(201).json(successResponse(account));
  } catch (err: any) {
    res.status(500).json(errorResponse('CONNECT_FAILED', err.message));
  }
}

export async function listAccounts(req: AuthRequest, res: Response): Promise<void> {
  const accounts = await service.listAccounts(getCurrentUserId());
  res.json(successResponse(accounts));
}

export async function updateAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const updated = await service.updateAccount(getCurrentUserId(), req.params.id, req.body);
    res.json(successResponse(updated));
  } catch (err: any) {
    res.status(500).json(errorResponse('UPDATE_FAILED', err.message));
  }
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    await service.deleteAccount(getCurrentUserId(), req.params.id);
    res.json(successResponse({ deleted: true }));
  } catch (err: any) {
    res.status(500).json(errorResponse('DELETE_FAILED', err.message));
  }
}

export async function testConnection(req: AuthRequest, res: Response): Promise<void> {
  try {
    const success = await service.testConnection(getCurrentUserId(), req.params.id);
    res.json(successResponse({ success }));
  } catch (err: any) {
    res.status(500).json(errorResponse('TEST_FAILED', err.message));
  }
}

export async function syncAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    await service.syncAccount(getCurrentUserId(), req.params.id);
    res.json(successResponse({ synced: true }));
  } catch (err: any) {
    res.status(500).json(errorResponse('SYNC_FAILED', err.message));
  }
}

export async function listNotifications(req: AuthRequest, res: Response): Promise<void> {
  const notifications = await service.listNotifications(getCurrentUserId());
  res.json(successResponse(notifications));
}

export async function listMessages(req: AuthRequest, res: Response): Promise<void> {
  const messages = await service.listMessages(getCurrentUserId());
  res.json(successResponse(messages));
}

export async function replyToMessage(req: AuthRequest, res: Response): Promise<void> {
  const { replyText } = req.body as { replyText: string };
  if (!replyText) {
    res.status(400).json(errorResponse('MISSING_REPLY', 'Reply text is required'));
    return;
  }

  try {
    const updated = await service.replyToMessage(getCurrentUserId(), req.params.id, replyText);
    res.json(successResponse(updated));
  } catch (err: any) {
    res.status(500).json(errorResponse('REPLY_FAILED', err.message));
  }
}
