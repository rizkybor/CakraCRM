import { z } from 'zod';
import { Role } from '@prisma/client';

const password = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(128)
  .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
  .regex(/[0-9]/, 'Password harus mengandung angka');

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Invalid email address'));

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password,
    role: z.enum(Role).default('SALES'),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: email.optional(),
    password: password.optional(),
    role: z.enum(Role).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const listUsersQuery = z
  .object({
    search: z.string().trim().max(100).optional(),
    role: z.enum(Role).optional(),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
