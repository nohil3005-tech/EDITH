import { asyncHandler } from '../middleware/asyncHandler';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import { uploadRateLimiter } from '../middleware/rateLimiter';
import { env } from '../config/env';
import {
  uploadFile, listFiles, getFile, deleteFile, shareFile, downloadSharedFile, downloadFileById, getFileContent, editFileWithAI,
} from '../controllers/filesController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, _file, cb) => cb(null, true),
});

const listFilesSchema = z.object({
  folder: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

const shareSchema = z.object({
  expiresInHours: z.number().min(1).max(720).optional().default(24),
});

router.post('/upload', uploadRateLimiter, upload.single('file'), uploadFile);
router.get('/', validateQuery(listFilesSchema), listFiles);
router.get('/download/:shareToken', asyncHandler(downloadSharedFile));
router.get('/:id/download', asyncHandler(downloadFileById));
router.get('/:id/content', asyncHandler(getFileContent));
router.post('/:id/edit-ai', asyncHandler(editFileWithAI));
router.get('/:id', asyncHandler(getFile));
router.delete('/:id', asyncHandler(deleteFile));
router.post('/:id/share', asyncHandler(shareFile));

export default router;
