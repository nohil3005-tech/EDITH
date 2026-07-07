/**
 * EDITH Desktop — File Manager (SQLite + local storage)
 */

import { eq, and, like, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { files, activeFreelanceJobs } from '../../db/schema';
import { StorageService } from './StorageService';
import { AppError } from '../../middleware/errorHandler';
import { generateShareToken } from '../../utils/fingerprint';
import { DEFAULT_USER_ID } from '../../config/constants';
import { logger } from '../../utils/logger';

export class FileManager {
  private readonly db      = getDatabase();
  private readonly storage = new StorageService();

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = 'general',
    tags: string[] = [],
  ) {
    const result = await this.storage.upload(buffer, originalName, mimeType, folder);

    const [file] = await this.db
      .insert(files)
      .values({
        id:              uuidv4(),
        userId:          DEFAULT_USER_ID,
        filename:        result.storagePath.split('/').pop() ?? originalName,
        originalName,
        mimeType,
        sizeBytes:       buffer.length,
        storageProvider: result.storageProvider,
        storagePath:     result.storagePath,
        publicUrl:       result.publicUrl,
        folder,
        tags,
      } as any)
      .returning();

    return file;
  }

  async list(opts: { folder?: string; search?: string; page?: number; limit?: number }) {
    const { folder, search, page = 1, limit = 20 } = opts;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(files.userId, DEFAULT_USER_ID)];
    if (folder) conditions.push(eq(files.folder, folder));
    if (search) conditions.push(like(files.originalName, `%${search}%`));

    const rows = await this.db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset);

    const all = await this.db
      .select({ id: files.id })
      .from(files)
      .where(eq(files.userId, DEFAULT_USER_ID));

    return { rows, total: all.length };
  }

  async getById(id: string) {
    const [file] = await this.db.select().from(files).where(eq(files.id, id)).limit(1);
    if (!file) throw new AppError(404, 'FILE_NOT_FOUND', 'File not found');
    return file;
  }

  async delete(id: string) {
    const file = await this.getById(id);
    await this.storage.delete(file.storagePath);
    await this.db.delete(files).where(eq(files.id, id));
  }

  async createShareLink(id: string, expiresInHours: number = 24) {
    const file      = await this.getById(id);
    const token     = generateShareToken();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.db
      .update(files)
      .set({ shareToken: token, shareExpiresAt: expiresAt.toISOString() } as any)
      .where(eq(files.id, id));

    return { token, expiresAt, shareUrl: `/api/v1/files/download/${token}` };
  }

  async getByShareToken(token: string) {
    const [file] = await this.db
      .select()
      .from(files)
      .where(eq(files.shareToken, token))
      .limit(1);

    if (!file) throw new AppError(404, 'FILE_NOT_FOUND', 'Share link not found or expired');

    if (file.shareExpiresAt && new Date() > new Date(file.shareExpiresAt as string)) {
      throw new AppError(410, 'LINK_EXPIRED', 'Share link has expired');
    }

    await this.db
      .update(files)
      .set({ downloadCount: (file.downloadCount ?? 0) + 1 } as any)
      .where(eq(files.id, file.id));

    const url = this.storage.getFullPath(file.storagePath);
    return { file, downloadUrl: `file://${url.replace(/\\/g, '/')}` };
  }

  async updateContent(id: string, buffer: Buffer) {
    const file = await this.getById(id);
    const fullPath = this.storage.getFullPath(file.storagePath);
    const { writeFileSync } = await import('fs');
    writeFileSync(fullPath, buffer);

    await this.db
      .update(files)
      .set({ sizeBytes: buffer.length } as any)
      .where(eq(files.id, id));

    // Sync with active freelance jobs if this file is linked to a subtask
    try {
      const activeJobs = await this.db.select().from(activeFreelanceJobs);
      const textContent = buffer.toString('utf8');
      
      for (const job of activeJobs) {
        let subtasks = (job.subtasks || []) as any[];
        let updated = false;
        
        subtasks = subtasks.map((task: any) => {
          if (task.fileId === id) {
            updated = true;
            return { ...task, output: textContent };
          }
          return task;
        });
        
        if (updated) {
          await this.db
            .update(activeFreelanceJobs)
            .set({ subtasks, updatedAt: new Date().toISOString() as any })
            .where(eq(activeFreelanceJobs.id, job.id));
          logger.info({ jobId: job.id, fileId: id }, 'Synced edited file content back to active job subtask output');
        }
      }
    } catch (syncErr: any) {
      logger.error({ err: syncErr.message }, 'Failed to sync edited file content back to active job');
    }

    return this.getById(id);
  }
}
