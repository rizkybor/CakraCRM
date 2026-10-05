import type { Role } from '@prisma/client';
import { z } from 'zod';

export type AuthUser = { id: string; role: Role };

/** ADMIN and MANAGER see everything; SALES only sees records they own. */
export const canSeeAll = (user: AuthUser) => user.role === 'ADMIN' || user.role === 'MANAGER';

export const ownerScope = (user: AuthUser): { ownerId?: string } =>
  canSeeAll(user) ? {} : { ownerId: user.id };

/** SALES can never assign records to someone else. */
export const resolveOwnerId = (user: AuthUser, requested?: string) =>
  canSeeAll(user) && requested ? requested : user.id;

export const idParam = z.object({ id: z.string().min(1).max(64) }).strict();

export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

/** Optional trimmed text field; empty string becomes null so it can clear a value. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullish();
