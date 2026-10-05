import { z } from 'zod';
import { LeadStatus } from '@prisma/client';
import { optionalText, paginationQuery } from '../../lib/access';

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .transform((v) => (v === '' ? null : v))
  .pipe(z.email('Invalid email address').nullable())
  .nullish();

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[0-9+()\-.\s]*$/, 'Nomor telepon tidak valid')
  .transform((v) => (v === '' ? null : v))
  .nullish();

const leadFields = {
  name: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  email: optionalEmail,
  phone: optionalPhone,
  company: optionalText(120),
  status: z.enum(LeadStatus),
  source: optionalText(60),
  notes: optionalText(5000),
  ownerId: z.string().min(1).max(64).optional(),
};

export const createLeadSchema = z
  .object({ ...leadFields, status: leadFields.status.default('NEW') })
  .strict();

export const updateLeadSchema = z.object(leadFields).partial().strict();

export const listLeadsQuery = z
  .object({
    ...paginationQuery,
    search: z.string().trim().max(100).optional(),
    status: z.enum(LeadStatus).optional(),
    ownerId: z.string().max(64).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'company']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuery>;
