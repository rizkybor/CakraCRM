import { useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { CalendarClock, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared';
import { DealFormDialog } from '@/components/DealFormDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { useDeals, useUpdateDealStage } from '@/hooks/useDeals';
import { getErrorMessage } from '@/lib/api';
import { DEAL_STAGES, DEAL_STAGE_LABEL, type Deal, type DealStage } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const COLUMN_ACCENT: Record<DealStage, string> = {
  LEAD_IN: 'border-t-slate-400',
  CONTACT_MADE: 'border-t-blue-500',
  DEMO_SCHEDULED: 'border-t-violet-500',
  PROPOSAL_SENT: 'border-t-amber-500',
  WON: 'border-t-emerald-500',
  LOST: 'border-t-red-500',
};

export default function PipelinePage() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const { data: deals = [], isLoading } = useDeals(debounced);
  const updateStage = useUpdateDealStage(debounced);

  const [dragOver, setDragOver] = useState<DealStage | null>(null);
  const [createStage, setCreateStage] = useState<DealStage | null>(null);

  const columns = useMemo(
    () =>
      DEAL_STAGES.map((stage) => {
        const items = deals.filter((d) => d.stage === stage);
        return { stage, items, total: items.reduce((sum, d) => sum + Number(d.value), 0) };
      }),
    [deals],
  );

  const moveDeal = (deal: Deal, stage: DealStage) => {
    if (deal.stage === stage) return;
    updateStage.mutate(
      { id: deal.id, stage },
      {
        onSuccess: () => toast.success(`"${deal.title}" dipindah ke ${DEAL_STAGE_LABEL[stage]}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const onDrop = (e: DragEvent, stage: DealStage) => {
    e.preventDefault();
    setDragOver(null);
    const deal = deals.find((d) => d.id === e.dataTransfer.getData('text/plain'));
    if (deal) moveDeal(deal, stage);
  };

  return (
    <>
      <PageHeader
        title="Pipeline Penjualan"
        description="Seret kartu antar kolom atau ubah stage melalui dropdown"
        actions={
          <Button onClick={() => setCreateStage('LEAD_IN')}>
            <Plus /> Tambah Deal
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari deal atau lead..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(({ stage, items, total }) => (
          <section
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage);
            }}
            onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
            onDrop={(e) => onDrop(e, stage)}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-lg border border-t-4 bg-muted/40 transition-colors',
              COLUMN_ACCENT[stage],
              dragOver === stage && 'bg-accent',
            )}
          >
            <header className="flex items-start justify-between gap-2 p-3">
              <div>
                <h2 className="text-sm font-semibold">
                  {DEAL_STAGE_LABEL[stage]} <span className="font-normal text-muted-foreground">({items.length})</span>
                </h2>
                <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setCreateStage(stage)} title="Tambah deal">
                <Plus />
              </Button>
            </header>

            <div className="flex min-h-32 flex-1 flex-col gap-2 p-2 pt-0">
              {isLoading &&
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 bg-background" />)}
              {items.map((deal) => (
                <article
                  key={deal.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', deal.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className="cursor-grab rounded-md border bg-card p-3 shadow-xs active:cursor-grabbing"
                >
                  <Link to={`/deals/${deal.id}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
                    {deal.title}
                  </Link>
                  {deal.lead && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {deal.lead.name}
                      {deal.lead.company ? ` · ${deal.lead.company}` : ''}
                    </p>
                  )}
                  <p className="mt-2 text-sm font-semibold">{formatCurrency(deal.value, deal.currency)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{deal.owner?.name}</span>
                    {deal.expectedCloseDate && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="size-3" />
                        {formatDate(deal.expectedCloseDate)}
                      </span>
                    )}
                  </div>
                  <Select value={deal.stage} onValueChange={(v) => moveDeal(deal, v as DealStage)}>
                    <SelectTrigger className="mt-2 h-7 text-xs" aria-label="Ubah stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DEAL_STAGE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <DealFormDialog
        open={!!createStage}
        onOpenChange={(o) => !o && setCreateStage(null)}
        defaultStage={createStage ?? undefined}
      />
    </>
  );
}
