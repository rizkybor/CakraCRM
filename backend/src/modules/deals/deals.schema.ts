import { z } from 'zod';
import { DealStage } from '@prisma/client';

const dealFields = {
  title: z.string().trim().min(1, 'Judul deal wajib diisi').max(150),
  value: z.coerce.number().nonnegative('Nilai tidak boleh negatif').max(999_999_999_999),
  currency: z.string().trim().toUpperCase().length(3).default('IDR'),
  stage: z.enum(DealStage),
  expectedCloseDate: z.coerce.date().nullish(),
  leadId: z.string().min(1).max(64).nullish(),
  ownerId: z.string().min(1).max(64).optional(),
};

export const createDealSchema = z
  .object({ ...dealFields, stage: dealFields.stage.default('LEAD_IN') })
  .strict();

export const updateDealSchema = z
  .object({ ...dealFields, currency: z.string().trim().toUpperCase().length(3) })
  .partial()
  .strict();

export const updateStageSchema = z.object({ stage: z.enum(DealStage) }).strict();

export const listDealsQuery = z
  .object({
    search: z.string().trim().max(100).optional(),
    stage: z.enum(DealStage).optional(),
    ownerId: z.string().max(64).optional(),
    leadId: z.string().max(64).optional(),
  })
  .strict();

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type ListDealsQuery = z.infer<typeof listDealsQuery>;
