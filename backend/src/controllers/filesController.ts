import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FileManager } from '../services/storage/FileManager';
import { successResponse, errorResponse, paginationMeta } from '../types/api';
import { StorageService } from '../services/storage/StorageService';
import { readFileSync } from 'fs';
import { getLLMClient } from '../utils/llmClient';

const fileManager = new FileManager();
const storageService = new StorageService();

export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) { res.status(400).json(errorResponse('NO_FILE', 'No file provided')); return; }
  const { folder = 'general', tags } = req.body as { folder?: string; tags?: string };
  const tagList = tags ? tags.split(',').map((t: string) => t.trim()) : [];
  const file = await fileManager.upload(req.file.buffer, req.file.originalname, req.file.mimetype, folder, tagList);
  res.status(201).json(successResponse(file));
}

export async function listFiles(req: AuthRequest, res: Response): Promise<void> {
  const { folder, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const { rows, total } = await fileManager.list({ folder, search, page: parseInt(page), limit: parseInt(limit) });
  res.json(successResponse(rows, paginationMeta(parseInt(page), parseInt(limit), total)));
}

export async function getFile(req: AuthRequest, res: Response): Promise<void> {
  const file = await fileManager.getById(req.params.id);
  res.json(successResponse(file));
}

export async function deleteFile(req: AuthRequest, res: Response): Promise<void> {
  await fileManager.delete(req.params.id);
  res.json(successResponse({ deleted: true }));
}

export async function shareFile(req: AuthRequest, res: Response): Promise<void> {
  const { expiresInHours = 24 } = req.body as { expiresInHours?: number };
  const result = await fileManager.createShareLink(req.params.id, expiresInHours);
  res.json(successResponse(result));
}

export async function downloadSharedFile(req: AuthRequest, res: Response): Promise<void> {
  const { file, downloadUrl } = await fileManager.getByShareToken(req.params.shareToken);
  res.redirect(downloadUrl);
}

export async function downloadFileById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const file = await fileManager.getById(req.params.id);
    const fullPath = storageService.getFullPath(file.storagePath);
    res.download(fullPath, file.originalName);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
}

export async function getFileContent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const file = await fileManager.getById(req.params.id);
    const fullPath = storageService.getFullPath(file.storagePath);
    
    const isText = file.mimeType.startsWith('text/') || 
                   file.mimeType === 'application/json' ||
                   file.originalName.endsWith('.txt') || 
                   file.originalName.endsWith('.md') || 
                   file.originalName.endsWith('.html') || 
                   file.originalName.endsWith('.css') || 
                   file.originalName.endsWith('.js') || 
                   file.originalName.endsWith('.ts') || 
                   file.originalName.endsWith('.json');
                   
    if (!isText) {
      res.status(400).json(errorResponse('NON_TEXT_FILE', 'Cannot preview non-text files directly. Please download to view.'));
      return;
    }

    const content = readFileSync(fullPath, 'utf8');
    res.json(successResponse({ content }));
  } catch (err: any) {
    res.status(500).json(errorResponse('READ_ERROR', err.message));
  }
}

export async function editFileWithAI(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { instruction } = req.body as { instruction?: string };
    if (!instruction) {
      res.status(400).json(errorResponse('MISSING_INSTRUCTION', 'Instruction prompt is required'));
      return;
    }

    const file = await fileManager.getById(req.params.id);
    const fullPath = storageService.getFullPath(file.storagePath);
    
    const isText = file.mimeType.startsWith('text/') || 
                   file.mimeType === 'application/json' ||
                   file.originalName.endsWith('.txt') || 
                   file.originalName.endsWith('.md') || 
                   file.originalName.endsWith('.html') || 
                   file.originalName.endsWith('.css') || 
                   file.originalName.endsWith('.js') || 
                   file.originalName.endsWith('.ts') || 
                   file.originalName.endsWith('.json');

    if (!isText) {
      res.status(400).json(errorResponse('NON_TEXT_FILE', 'Only text files can be edited with AI.'));
      return;
    }

    const originalContent = readFileSync(fullPath, 'utf8');
    const llm = getLLMClient();
    
    const systemPrompt = `You are EDITH's expert file editor. Your task is to modify the provided file content based on the user's instructions.
You must output ONLY the revised file content, with NO meta-commentary, NO introductory sentences, and NO markdown code block wrappers (unless the file itself is a markdown file). Ensure that you preserve the structure, format, and style of the original content except where changes are requested.`;

    const userPrompt = `ORIGINAL CONTENT:
"""
${originalContent}
"""

EDIT INSTRUCTION:
${instruction}

Provide the fully updated and revised file content below:`;

    const revisedContent = await llm.completeWithSystem(systemPrompt, userPrompt);
    
    // Save updated content
    const updatedFile = await fileManager.updateContent(file.id, Buffer.from(revisedContent, 'utf8'));
    
    res.json(successResponse({ content: revisedContent, file: updatedFile }));
  } catch (err: any) {
    res.status(500).json(errorResponse('EDIT_ERROR', err.message));
  }
}
