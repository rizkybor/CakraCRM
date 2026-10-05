import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { canSeeAll, ownerScope, resolveOwnerId, type AuthUser } from '../../lib/access';
import type { CreateLeadInput, ListLeadsQuery, UpdateLeadInput } from './leads.schema';

const ownerSelect = { select: { id: true, name: true, email: true } } as const;

export async function listLeads(user: AuthUser, q: ListLeadsQuery) {
  const where: Prisma.LeadWhereInput = {
    ...ownerScope(user),
    ...(canSeeAll(user) && q.ownerId && { ownerId: q.ownerId }),
    status: q.status,
    ...(q.search && {
      OR: [
        { name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { company: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
      ],
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      orderBy: { [q.sortBy]: q.sortOrder },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { owner: ownerSelect, _count: { select: { deals: true, activities: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    data,
    meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) },
  };
}

export async function getLead(user: AuthUser, id: string) {
  const lead = await prisma.lead.findFirst({
    where: { id, ...ownerScope(user) },
    include: {
      owner: ownerSelect,
      deals: { orderBy: { createdAt: 'desc' } },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!lead) throw AppError.notFound('Lead');
  return lead;
}

async function assertActiveOwner(ownerId: string) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { isActive: true } });
  if (!owner?.isActive) throw AppError.badRequest('Owner tidak valid');
}

export async function createLead(user: AuthUser, input: CreateLeadInput) {
  const ownerId = resolveOwnerId(user, input.ownerId);
  if (ownerId !== user.id) await assertActiveOwner(ownerId);
  return prisma.lead.create({
    data: { ...input, ownerId },
    include: { owner: ownerSelect },
  });
}

async function findScoped(user: AuthUser, id: string) {
  const lead = await prisma.lead.findFirst({ where: { id, ...ownerScope(user) }, select: { id: true } });
  if (!lead) throw AppError.notFound('Lead');
  return lead;
}

export async function updateLead(user: AuthUser, id: string, input: UpdateLeadInput) {
  await findScoped(user, id);
  const { ownerId, ...rest } = input;
  const data: Prisma.LeadUncheckedUpdateInput = { ...rest };
  if (ownerId && canSeeAll(user)) {
    await assertActiveOwner(ownerId);
    data.ownerId = ownerId;
  }
  return prisma.lead.update({ where: { id }, data, include: { owner: ownerSelect } });
}

export async function deleteLead(user: AuthUser, id: string) {
  await findScoped(user, id);
  await prisma.lead.delete({ where: { id } });
}
