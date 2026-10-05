import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { hashPassword } from '../../lib/password';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schema';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export function listUsers(query: ListUsersQuery) {
  return prisma.user.findMany({
    where: {
      role: query.role,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { name: 'asc' },
    select: publicUserSelect,
  });
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.conflict('Email sudah terdaftar');
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
    select: publicUserSelect,
  });
}

export async function updateUser(actorId: string, id: string, input: UpdateUserInput) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw AppError.notFound('User');

  if (actorId === id && (input.isActive === false || (input.role && input.role !== 'ADMIN'))) {
    throw AppError.badRequest('Anda tidak dapat menonaktifkan atau menurunkan role akun sendiri');
  }

  const { password, ...rest } = input;
  const user = await prisma.user.update({
    where: { id },
    data: { ...rest, ...(password && { passwordHash: await hashPassword(password) }) },
    select: publicUserSelect,
  });

  // Credentials or access changed: force re-login on other devices.
  if (password || input.isActive === false || input.role) {
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return user;
}
