import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Parses (and thereby sanitizes) request input with Zod. Unknown keys are
 * rejected by the `.strict()` schemas; ZodErrors are turned into 400s by the
 * error handler.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
    if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  };

export const getQuery = <T>(req: Request): T => req.validatedQuery as T;
