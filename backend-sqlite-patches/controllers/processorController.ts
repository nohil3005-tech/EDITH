import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { processorService } from '../services/processor/ProcessorService';
import { successResponse, errorResponse } from '../types/api';
import { getCurrentUserId } from '../utils/context';
import { FileManager } from '../services/storage/FileManager';
import { StorageService } from '../services/storage/StorageService';

const fileManager = new FileManager();
const storageService = new StorageService();

export async function startSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const session = await processorService.startSession(getCurrentUserId(), req.params.jobId);
    res.status(201).json(successResponse(session));
  } catch (err: any) {
    res.status(500).json(errorResponse('START_FAILED', err.message));
  }
}

export async function getSessionStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const status = await processorService.getSessionStatus(getCurrentUserId(), req.params.sessionId);
    res.json(successResponse(status));
  } catch (err: any) {
    res.status(500).json(errorResponse('GET_STATUS_FAILED', err.message));
  }
}

export async function pauseSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const updated = await processorService.pauseSession(getCurrentUserId(), req.params.sessionId);
    res.json(successResponse(updated));
  } catch (err: any) {
    res.status(500).json(errorResponse('PAUSE_FAILED', err.message));
  }
}

export async function resumeSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const updated = await processorService.resumeSession(getCurrentUserId(), req.params.sessionId);
    res.json(successResponse(updated));
  } catch (err: any) {
    res.status(500).json(errorResponse('RESUME_FAILED', err.message));
  }
}

export async function cancelSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const updated = await processorService.cancelSession(getCurrentUserId(), req.params.sessionId);
    res.json(successResponse(updated));
  } catch (err: any) {
    res.status(500).json(errorResponse('CANCEL_FAILED', err.message));
  }
}

export async function downloadSessionFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const session = await processorService.getSessionStatus(getCurrentUserId(), req.params.sessionId);
    const filesList = session.outputFiles || [];
    if (filesList.length === 0) {
      res.status(404).send('No files compiled for download.');
      return;
    }

    // Prefer the ZIP package, otherwise download the first file in list
    const target = filesList.find((f: any) => f.filename.endsWith('.zip')) || filesList[0];
    const dbFile = await fileManager.getById(target.fileId);
    const fullPath = storageService.getFullPath(dbFile.storagePath);

    res.download(fullPath, dbFile.originalName);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
}
