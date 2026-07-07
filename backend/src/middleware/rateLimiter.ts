import rateLimit from 'express-rate-limit';
import { errorResponse } from '../types/api';

export const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse('RATE_LIMITED', 'Too many requests, please try again later.', { retryAfter: 900 }));
  },
});

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  handler: (_req, res) => {
    res.status(429).json(errorResponse('RATE_LIMITED', 'Chat rate limit exceeded. Please wait a moment.', { retryAfter: 60 }));
  },
});

export const scanRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  handler: (_req, res) => {
    res.status(429).json(errorResponse('RATE_LIMITED', 'Scan limit reached. Maximum 10 scans per hour.', { retryAfter: 3600 }));
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  handler: (_req, res) => {
    res.status(429).json(errorResponse('RATE_LIMITED', 'Upload limit exceeded.', { retryAfter: 3600 }));
  },
});
