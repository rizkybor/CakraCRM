import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { ACCESS_COOKIE } from '../lib/cookies';
import { verifyAccessToken } from '../lib/tokens';

export const authenticate: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[ACCESS_COOKIE];
  if (typeof token !== 'string' || !token) {
    throw AppError.unauthorized('Authentication required');
  }
  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, role: claims.role };
  } catch {
    // The frontend reacts to TOKEN_EXPIRED by calling /auth/refresh.
    throw AppError.unauthorized('Session expired', 'TOKEN_EXPIRED');
  }
  next();
};

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
