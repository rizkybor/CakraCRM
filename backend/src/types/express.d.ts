import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
      /** Query string after Zod validation (Express 5 makes req.query read-only). */
      validatedQuery?: unknown;
    }
  }
}

export {};
