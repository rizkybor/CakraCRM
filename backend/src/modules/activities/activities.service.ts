import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { canSeeAll, ownerScope, type AuthUser } from '../../lib/access';
import type { CreateActivityInput, ListActivitiesQuery, UpdateActivityInput } from './activities.schema';

const activityInclude = {
  user: { select: { id: true, name: true } },
  lead: { select: { id: true, name: true, company: true } },
  deal: { select: { id: true, title: true } },
} satisfies Prisma.ActivityInclude;

/** SALES see activities they wrote or that belong to their own leads/deals. */
function activityScope(user: AuthUser): Prisma.ActivityWhereInput {
  if (canSeeAll(user)) return {};
  return {
    OR: [{ userId: user.id }, { lead: { ownerId: user.id } }, { deal: { ownerId: user.id } }],
  };
}

export async function listActivities(user: AuthUser, q: ListActivitiesQuery) {
  const where: Prisma.ActivityWhereInput = {
    AND: [
      activityScope(user),
      {
        leadId: q.leadId,
        dealId: q.dealId,
        type: q.type,
        ...(q.status === 'open' && { completedAt: null }),
        ...(q.status === 'completed' && { completedAt: { not: null } }),
      },
    ],
  };
  const [data, total] = await prisma.$transaction([
    prisma.activity.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: activityInclude,
    }),
    prisma.activity.count({ where }),
  ]);
  return {
    data,
    meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) },
  };
}

export async function createActivity(user: AuthUser, input: CreateActivityInput) {
  let leadId = input.leadId ?? null;

  if (input.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: input.dealId, ...ownerScope(user) },
      select: { leadId: true },
    });
    if (!deal) throw AppError.badRequest('Deal tidak ditemukan');
    // Inherit the deal's lead so the activity shows up on the lead timeline too.
    leadId ??= deal.leadId;
  }
  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, ...ownerScope(user) }, select: { id: true } });
    if (!lead) throw AppError.badRequest('Lead tidak ditemukan');
  }

  const { completed, ...rest } = input;
  return prisma.activity.create({
    data: {
      ...rest,
      leadId,
      dealId: input.dealId ?? null,
      userId: user.id,
      completedAt: completed ? new Date() : null,
    },
    include: activityInclude,
  });
}

/** Only the author or a manager/admin may change an activity. */
async function findEditable(user: AuthUser, id: string) {
  const activity = await prisma.activity.findFirst({
    where: { id, AND: [activityScope(user)] },
    select: { id: true, userId: true, completedAt: true },
  });
  if (!activity) throw AppError.notFound('Activity');
  if (!canSeeAll(user) && activity.userId !== user.id) throw AppError.forbidden();
  return activity;
}

export async function updateActivity(user: AuthUser, id: string, input: UpdateActivityInput) {
  const current = await findEditable(user, id);
  const { completed, ...rest } = input;
  const data: Prisma.ActivityUpdateInput = { ...rest };
  if (completed !== undefined) {
    data.completedAt = completed ? (current.completedAt ?? new Date()) : null;
  }
  return prisma.activity.update({ where: { id }, data, include: activityInclude });
}

export async function deleteActivity(user: AuthUser, id: string) {
  await findEditable(user, id);
  await prisma.activity.delete({ where: { id } });
}
