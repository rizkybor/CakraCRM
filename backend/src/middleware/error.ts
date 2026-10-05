import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';

export const notFoundHandler: RequestHandler = (req) => {
  throw AppError.notFound(`Route ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message, code: err.code });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'A record with this value already exists', code: 'CONFLICT' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Record not found', code: 'NOT_FOUND' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ message: 'Record is still referenced by other data', code: 'CONFLICT' });
      return;
    }
  }

  // body-parser errors (malformed JSON, payload too large)
  if (typeof err === 'object' && err && 'type' in err && 'status' in err) {
    const status = Number((err as { status: number }).status) || 400;
    res.status(status).json({ message: 'Invalid request body', code: 'BAD_REQUEST' });
    return;
  }

  console.error(err);
  res.status(500).json({
    message: env.isProduction ? 'Internal server error' : String(err?.message ?? err),
    code: 'INTERNAL_ERROR',
  });
};
