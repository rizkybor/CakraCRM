import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog, DealStageBadge, EmptyState } from '@/components/shared';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ActivityFormDialog } from '@/components/ActivityFormDialog';
import { DealFormDialog } from '@/components/DealFormDialog';
import { hasRole, useMe } from '@/hooks/useAuth';
import { useDeal, useDeleteDeal, useUpdateDeal } from '@/hooks/useDeals';
import { getErrorMessage } from '@/lib/api';
import { DEAL_STAGES, DEAL_STAGE_LABEL, type DealStage } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: deal, isLoading, isError } = useDeal(id);
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();

  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !deal) {
    return <EmptyState title="Deal tidak ditemukan" action={<Button onClick={() => navigate('/pipeline')}>Kembali</Button>} />;
  }

  const changeStage = async (stage: DealStage) => {
    try {
      await updateDeal.mutateAsync({ id: deal.id, stage });
      toast.success(`Stage diubah ke ${DEAL_STAGE_LABEL[stage]}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDeal.mutateAsync(deal.id);
      toast.success('Deal dihapus');
      navigate('/pipeline', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <Link to="/pipeline" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Pipeline
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{deal.title}</h1>
            <DealStageBadge stage={deal.stage} />
          </div>
          <p className="mt-1 text-2xl font-semibold text-primary">{formatCurrency(deal.value, deal.currency)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </Button>
          {hasRole(me, 'ADMIN', 'MANAGER') && (
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="text-destructive" /> Hapus
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Detail Deal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2">
              <span className="text-muted-foreground">Stage</span>
              <Select value={deal.stage} onValueChange={(v) => changeStage(v as DealStage)}>
                <SelectTrigger>
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
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <dt className="text-muted-foreground">Lead</dt>
              <dd>
                {deal.lead ? (
                  <Link to={`/leads/${deal.lead.id}`} className="text-primary hover:underline">
                    {deal.lead.name}
                  </Link>
                ) : (
                  '-'
                )}
              </dd>
              <dt className="text-muted-foreground">Owner</dt>
              <dd>{deal.owner?.name ?? '-'}</dd>
              <dt className="text-muted-foreground">Target closing</dt>
              <dd>{formatDate(deal.expectedCloseDate)}</dd>
              <dt className="text-muted-foreground">Ditutup</dt>
              <dd>{formatDate(deal.closedAt)}</dd>
              <dt className="text-muted-foreground">Dibuat</dt>
              <dd>{formatDate(deal.createdAt)}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Aktivitas</CardTitle>
            <Button size="sm" onClick={() => setActivityOpen(true)}>
              <Plus /> Catat Aktivitas
            </Button>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={deal.activities} />
          </CardContent>
        </Card>
      </div>

      <DealFormDialog open={editOpen} onOpenChange={setEditOpen} deal={deal} />
      <ActivityFormDialog open={activityOpen} onOpenChange={setActivityOpen} dealId={deal.id} leadId={deal.leadId} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus deal?"
        description="Deal beserta aktivitas yang terhubung akan dihapus permanen."
        loading={deleteDeal.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
