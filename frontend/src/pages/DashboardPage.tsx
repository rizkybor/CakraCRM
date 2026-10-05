import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Briefcase, Percent, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useMe } from '@/hooks/useAuth';
import { DEAL_STAGE_LABEL, LEAD_STATUS_LABEL } from '@/lib/types';
import { formatCompactCurrency, formatCurrency } from '@/lib/utils';

// Single-series charts: one hue each, no legend needed (the title names the series).
const SERIES_COLOR = '#2a78d6';

function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: LucideIcon }) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardDescription className="font-medium">{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-5">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(new Date(y!, m! - 1, 1));
};

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
  fontSize: 12,
};
const axisTick = { fill: 'var(--muted-foreground)', fontSize: 12 };

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data, isLoading } = useDashboardSummary();

  const scopeHint = me?.role === 'SALES' ? 'Data milik Anda' : 'Seluruh tim';

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" description="Ringkasan performa penjualan" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="mt-6 h-80" />
      </>
    );
  }

  const { metrics } = data;
  const monthly = data.monthly.map((m) => ({ ...m, label: monthLabel(m.key) }));
  const pipeline = data.pipeline.map((p) => ({ ...p, label: DEAL_STAGE_LABEL[p.stage] }));

  return (
    <>
      <PageHeader title="Dashboard" description={`Ringkasan performa penjualan · ${scopeHint}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Leads" value={metrics.totalLeads.toLocaleString('id-ID')} icon={Users} />
        <MetricCard
          label="Active Deals"
          value={metrics.activeDeals.toLocaleString('id-ID')}
          hint="Deal yang belum Won/Lost"
          icon={Briefcase}
        />
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          hint={`Dari ${metrics.wonDeals} deal Won`}
          icon={Wallet}
        />
        <MetricCard
          label="Conversion Rate"
          value={`${metrics.conversionRate.toLocaleString('id-ID')}%`}
          hint={`${metrics.wonDeals} won / ${metrics.wonDeals + metrics.lostDeals} deal closed`}
          icon={Percent}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Revenue per Bulan</CardTitle>
            <CardDescription>Nilai deal Won, 6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={axisTick}
                  width={56}
                  tickFormatter={(v: number) => formatCompactCurrency(v)}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                  contentStyle={tooltipStyle}
                  formatter={(value, _name, item) => [
                    `${formatCurrency(Number(value))} (${(item.payload as { won: number }).won} deal)`,
                    'Revenue',
                  ]}
                />
                <Bar dataKey="revenue" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Deal per Stage</CardTitle>
            <CardDescription>Jumlah deal di setiap tahap pipeline</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={axisTick} width={110} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                  contentStyle={tooltipStyle}
                  formatter={(value, _name, item) => [
                    `${value} deal · ${formatCurrency((item.payload as { value: number }).value)}`,
                    'Total',
                  ]}
                />
                <Bar dataKey="count" fill={SERIES_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Status Leads</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {data.leadsByStatus.map((s) => (
            <div key={s.status} className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{LEAD_STATUS_LABEL[s.status]}</p>
              <p className="mt-1 text-xl font-semibold">{s.count}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
