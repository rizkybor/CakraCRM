import { z } from 'zod';
import { ActivityType } from '@prisma/client';
import { optionalText, paginationQuery } from '../../lib/access';

export const createActivitySchema = z
  .object({
    type: z.enum(ActivityType),
    subject: z.string().trim().min(1, 'Subjek wajib diisi').max(200),
    description: optionalText(5000),
    dueAt: z.coerce.date().nullish(),
    completed: z.boolean().optional(),
    leadId: z.string().min(1).max(64).nullish(),
    dealId: z.string().min(1).max(64).nullish(),
  })
  .strict()
  .refine((v) => v.leadId || v.dealId, {
    message: 'Aktivitas harus terhubung ke Lead atau Deal',
    path: ['leadId'],
  });

export const updateActivitySchema = z
  .object({
    type: z.enum(ActivityType).optional(),
    subject: z.string().trim().min(1).max(200).optional(),
    description: optionalText(5000),
    dueAt: z.coerce.date().nullish(),
    completed: z.boolean().optional(),
  })
  .strict();

export const listActivitiesQuery = z
  .object({
    ...paginationQuery,
    leadId: z.string().max(64).optional(),
    dealId: z.string().max(64).optional(),
    type: z.enum(ActivityType).optional(),
    status: z.enum(['open', 'completed']).optional(),
  })
  .strict();

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuery>;
