import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { errorResponse } from '../types/api';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(errorResponse('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json(
      errorResponse('VALIDATION_ERROR', 'Request validation failed', err.flatten().fieldErrors),
    );
    return;
  }

  // App-level error
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Application error');
    }
    res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details),
    );
    return;
  }

  // Generic error
  if (err instanceof Error) {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'),
    );
    return;
  }

  logger.error({ err }, 'Unknown error type');
  res.status(500).json(errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'));
}
