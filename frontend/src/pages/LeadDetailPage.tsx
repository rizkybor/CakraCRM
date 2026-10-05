import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog, DealStageBadge, EmptyState, LeadStatusBadge } from '@/components/shared';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ActivityFormDialog } from '@/components/ActivityFormDialog';
import { DealFormDialog } from '@/components/DealFormDialog';
import { LeadFormDialog } from '@/components/LeadFormDialog';
import { hasRole, useMe } from '@/hooks/useAuth';
import { useDeleteLead, useLead } from '@/hooks/useLeads';
import { getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: lead, isLoading, isError } = useLead(id);
  const deleteLead = useDeleteLead();

  const [editOpen, setEditOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !lead) {
    return <EmptyState title="Lead tidak ditemukan" action={<Button onClick={() => navigate('/leads')}>Kembali</Button>} />;
  }

  const handleDelete = async () => {
    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success('Lead dihapus');
      navigate('/leads', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Leads
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{lead.name}</h1>
            <LeadStatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Owner: {lead.owner.name} · Dibuat {formatDate(lead.createdAt)}
          </p>
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Kontak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" /> {lead.company ?? '-'}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  '-'
                )}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                    {lead.phone}
                  </a>
                ) : (
                  '-'
                )}
              </p>
              {lead.source && <p className="text-muted-foreground">Sumber: {lead.source}</p>}
              {lead.notes && <p className="rounded-md bg-muted p-3 whitespace-pre-wrap">{lead.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Deals</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDealOpen(true)}>
                <Plus /> Deal
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.deals.length === 0 && <p className="text-sm text-muted-foreground">Belum ada deal.</p>}
              {lead.deals.map((d) => (
                <Link key={d.id} to={`/deals/${d.id}`} className="block rounded-md border p-3 hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <DealStageBadge stage={d.stage} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(d.value, d.currency)}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Aktivitas</CardTitle>
            <Button size="sm" onClick={() => setActivityOpen(true)}>
              <Plus /> Catat Aktivitas
            </Button>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={lead.activities} />
          </CardContent>
        </Card>
      </div>

      <LeadFormDialog open={editOpen} onOpenChange={setEditOpen} lead={lead} />
      <DealFormDialog open={dealOpen} onOpenChange={setDealOpen} defaultLeadId={lead.id} />
      <ActivityFormDialog open={activityOpen} onOpenChange={setActivityOpen} leadId={lead.id} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus lead?"
        description="Lead beserta seluruh aktivitasnya akan dihapus permanen."
        loading={deleteLead.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
