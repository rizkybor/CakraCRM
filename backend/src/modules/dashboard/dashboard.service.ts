import { DealStage, LeadStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ownerScope, type AuthUser } from '../../lib/access';

const MONTHS = 6;

export async function getSummary(user: AuthUser) {
  const scope = ownerScope(user);
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);

  const [totalLeads, activeDeals, wonAgg, lostCount, byStage, byStatus, wonRecent, createdRecent] =
    await Promise.all([
      prisma.lead.count({ where: scope }),
      prisma.deal.count({ where: { ...scope, stage: { notIn: ['WON', 'LOST'] } } }),
      prisma.deal.aggregate({ where: { ...scope, stage: 'WON' }, _sum: { value: true }, _count: true }),
      prisma.deal.count({ where: { ...scope, stage: 'LOST' } }),
      prisma.deal.groupBy({ by: ['stage'], where: scope, _count: { _all: true }, _sum: { value: true } }),
      prisma.lead.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      prisma.deal.findMany({
        where: { ...scope, stage: 'WON', closedAt: { gte: since } },
        select: { value: true, closedAt: true },
      }),
      prisma.deal.findMany({ where: { ...scope, createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);

  const wonCount = wonAgg._count;
  const closed = wonCount + lostCount;

  // Monthly buckets for the sales performance chart.
  const monthly = Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, revenue: 0, won: 0, created: 0 };
  });
  const bucket = (date: Date) =>
    monthly.find((m) => m.key === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);

  for (const d of wonRecent) {
    const b = d.closedAt && bucket(d.closedAt);
    if (b) {
      b.revenue += Number(d.value);
      b.won += 1;
    }
  }
  for (const d of createdRecent) {
    const b = bucket(d.createdAt);
    if (b) b.created += 1;
  }

  return {
    metrics: {
      totalLeads,
      activeDeals,
      totalRevenue: Number(wonAgg._sum.value ?? 0),
      // Win rate: share of closed deals that were won.
      conversionRate: closed ? Math.round((wonCount / closed) * 1000) / 10 : 0,
      wonDeals: wonCount,
      lostDeals: lostCount,
    },
    pipeline: Object.values(DealStage).map((stage) => {
      const row = byStage.find((s) => s.stage === stage);
      return { stage, count: row?._count._all ?? 0, value: Number(row?._sum.value ?? 0) };
    }),
    leadsByStatus: Object.values(LeadStatus).map((status) => ({
      status,
      count: byStatus.find((s) => s.status === status)?._count._all ?? 0,
    })),
    monthly,
  };
}
