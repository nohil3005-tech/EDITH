/**
 * EDITH Desktop — Local Storage Service
 * Stores files in %APPDATA%/EDITH/uploads/
 * No S3, no Supabase, no R2 in desktop mode.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { logger } from '../../utils/logger';

export interface UploadResult {
  storageProvider: string;
  storagePath: string;
  publicUrl: string | null;
}

function getUploadsDir(): string {
  const appData =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? join(process.env.HOME!, 'Library', 'Application Support')
      : join(process.env.HOME!, '.config'));

  const dir = join(appData, 'EDITH', 'uploads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export class StorageService {
  private readonly provider = 'local';

  async upload(
    buffer: Buffer,
    filename: string,
    _mimeType: string,
    folder: string = 'general',
  ): Promise<UploadResult> {
    const uploadsDir = getUploadsDir();
    const folderDir  = join(uploadsDir, folder);
    if (!existsSync(folderDir)) mkdirSync(folderDir, { recursive: true });

    const safeName    = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fullPath    = join(folderDir, safeName);
    const storagePath = `${folder}/${safeName}`;

    writeFileSync(fullPath, buffer);
    logger.info({ storagePath, size: buffer.length }, 'File saved locally');

    return { storageProvider: 'local', storagePath, publicUrl: null };
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = join(getUploadsDir(), storagePath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
      logger.info({ storagePath }, 'File deleted');
    }
  }

  async getSignedDownloadUrl(storagePath: string, _expiresIn: number = 3600): Promise<string> {
    // In desktop mode, return the local file path as a file:// URL
    const fullPath = join(getUploadsDir(), storagePath);
    return `file://${fullPath.replace(/\\/g, '/')}`;
  }

  getFullPath(storagePath: string): string {
    return join(getUploadsDir(), storagePath);
  }
}
