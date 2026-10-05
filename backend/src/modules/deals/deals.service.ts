import type { DealStage, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { canSeeAll, ownerScope, resolveOwnerId, type AuthUser } from '../../lib/access';
import type { CreateDealInput, ListDealsQuery, UpdateDealInput } from './deals.schema';

const dealInclude = {
  owner: { select: { id: true, name: true } },
  lead: { select: { id: true, name: true, company: true } },
  _count: { select: { activities: true } },
} satisfies Prisma.DealInclude;

const isClosed = (stage: DealStage) => stage === 'WON' || stage === 'LOST';

/** closedAt follows the stage: set when entering WON/LOST, cleared when reopened. */
function closedAtFor(stage: DealStage | undefined, current?: { stage: DealStage; closedAt: Date | null }) {
  if (!stage) return undefined;
  if (!isClosed(stage)) return null;
  if (current && current.stage === stage && current.closedAt) return current.closedAt;
  return new Date();
}

async function assertLeadAccessible(user: AuthUser, leadId: string | null | undefined) {
  if (!leadId) return;
  const lead = await prisma.lead.findFirst({ where: { id: leadId, ...ownerScope(user) }, select: { id: true } });
  if (!lead) throw AppError.badRequest('Lead tidak ditemukan');
}

async function assertActiveOwner(ownerId: string) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { isActive: true } });
  if (!owner?.isActive) throw AppError.badRequest('Owner tidak valid');
}

export function listDeals(user: AuthUser, q: ListDealsQuery) {
  return prisma.deal.findMany({
    where: {
      ...ownerScope(user),
      ...(canSeeAll(user) && q.ownerId && { ownerId: q.ownerId }),
      stage: q.stage,
      leadId: q.leadId,
      ...(q.search && {
        OR: [
          { title: { contains: q.search, mode: 'insensitive' } },
          { lead: { name: { contains: q.search, mode: 'insensitive' } } },
          { lead: { company: { contains: q.search, mode: 'insensitive' } } },
        ],
      }),
    },
    orderBy: { updatedAt: 'desc' },
    include: dealInclude,
    take: 500,
  });
}

export async function getDeal(user: AuthUser, id: string) {
  const deal = await prisma.deal.findFirst({
    where: { id, ...ownerScope(user) },
    include: {
      ...dealInclude,
      activities: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!deal) throw AppError.notFound('Deal');
  return deal;
}

export async function createDeal(user: AuthUser, input: CreateDealInput) {
  await assertLeadAccessible(user, input.leadId);
  const ownerId = resolveOwnerId(user, input.ownerId);
  if (ownerId !== user.id) await assertActiveOwner(ownerId);
  return prisma.deal.create({
    data: { ...input, ownerId, closedAt: closedAtFor(input.stage) },
    include: dealInclude,
  });
}

async function findScoped(user: AuthUser, id: string) {
  const deal = await prisma.deal.findFirst({
    where: { id, ...ownerScope(user) },
    select: { id: true, stage: true, closedAt: true },
  });
  if (!deal) throw AppError.notFound('Deal');
  return deal;
}

export async function updateDeal(user: AuthUser, id: string, input: UpdateDealInput) {
  const current = await findScoped(user, id);
  await assertLeadAccessible(user, input.leadId);
  const { ownerId, ...rest } = input;
  const data: Prisma.DealUncheckedUpdateInput = { ...rest, closedAt: closedAtFor(input.stage, current) };
  if (ownerId && canSeeAll(user)) {
    await assertActiveOwner(ownerId);
    data.ownerId = ownerId;
  }
  return prisma.deal.update({ where: { id }, data, include: dealInclude });
}

export async function updateStage(user: AuthUser, id: string, stage: DealStage) {
  const current = await findScoped(user, id);
  return prisma.deal.update({
    where: { id },
    data: { stage, closedAt: closedAtFor(stage, current) },
    include: dealInclude,
  });
}

export async function deleteDeal(user: AuthUser, id: string) {
  await findScoped(user, id);
  await prisma.deal.delete({ where: { id } });
}
