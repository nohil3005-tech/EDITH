import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('../src/config/env', () => ({
  env: {
    get API_KEY() { return process.env.API_KEY || 'test-api-key'; },
    get NODE_ENV() { return process.env.NODE_ENV || 'test'; },
    get JWT_SECRET() { return 'edith-secret-jwt-key-2026'; }
  }
}));

import { authMiddleware } from '../src/middleware/auth';
import { DEFAULT_USER_ID } from '../src/config/constants';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request> & { user?: { id: string; email: string }; headers: Record<string, string> };
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: ReturnType<typeof vi.fn>;
  let jsonSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    mockReq = { headers: {} };
    mockRes = { status: statusSpy, json: jsonSpy };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should attach default user to request', () => {
    process.env.API_KEY = 'dev-api-key';
    mockReq.headers['x-api-key'] = 'dev-api-key';
    authMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user?.id).toBe(DEFAULT_USER_ID);
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('should allow requests when API key matches', () => {
    process.env.API_KEY = 'secret-key-123';
    mockReq.headers['x-api-key'] = 'secret-key-123';
    authMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockReq.user?.id).toBe(DEFAULT_USER_ID);
  });

  it('should reject requests with wrong API key', () => {
    process.env.API_KEY = 'secret-key-123';
    mockReq.headers['x-api-key'] = 'wrong-key';
    authMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(statusSpy).toHaveBeenCalledWith(401);
  });
});

describe('Error Handler', () => {
  it('should format AppError correctly', async () => {
    const { AppError, globalErrorHandler } = await import('../src/middleware/errorHandler');
    const err = new AppError(404, 'NOT_FOUND', 'Resource not found', { id: '123' });

    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.details).toEqual({ id: '123' });
    expect(err instanceof Error).toBe(true);
  });

  it('should handle ZodError in global handler', async () => {
    const { z } = await import('zod');
    const schema = z.object({ name: z.string().min(1) });
    let zodErr: unknown;
    try {
      schema.parse({ name: '' });
    } catch (e) {
      zodErr = e;
    }

    const jsonSpy = vi.fn();
    const statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    const mockRes = { status: statusSpy } as any;
    const { globalErrorHandler } = await import('../src/middleware/errorHandler');

    globalErrorHandler(zodErr, {} as any, mockRes, vi.fn());
    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });
});

describe('Validate Middleware', () => {
  it('should pass valid body through', async () => {
    const { z } = await import('zod');
    const { validateBody } = await import('../src/middleware/validate');
    const schema = z.object({ name: z.string() });
    const middleware = validateBody(schema);

    const req = { body: { name: 'EDITH' } } as any;
    const next = vi.fn();
    middleware(req, {} as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body.name).toBe('EDITH');
  });

  it('should reject invalid body', async () => {
    const { z } = await import('zod');
    const { validateBody } = await import('../src/middleware/validate');
    const schema = z.object({ amount: z.number().min(1) });
    const middleware = validateBody(schema);

    const jsonSpy = vi.fn();
    const statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    const req = { body: { amount: -5 } } as any;
    middleware(req, { status: statusSpy } as any, vi.fn());
    expect(statusSpy).toHaveBeenCalledWith(400);
  });
});
