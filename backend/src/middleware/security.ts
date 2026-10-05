import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../lib/AppError';

const message = (msg: string) => ({ message: msg, code: 'RATE_LIMITED' });

/** General API throttle per IP. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many requests, please try again later.'),
});

/** Brute-force protection for login: only failed attempts count. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many login attempts. Please try again in 15 minutes.'),
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many session refresh requests.'),
});

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-based auth: state-changing requests must carry a
 * custom header. Browsers only allow cross-origin custom headers after a CORS
 * preflight, which our CORS policy only grants to CLIENT_URL.
 */
export const requireAjaxHeader: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    throw new AppError(403, 'Missing X-Requested-With header', 'CSRF_REJECTED');
  }
  next();
};
