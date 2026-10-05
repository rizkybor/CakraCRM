import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog, EmptyState, LeadStatusBadge, PageHeader, Pagination } from '@/components/shared';
import { LeadFormDialog } from '@/components/LeadFormDialog';
import { hasRole, useMe } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useDeleteLead, useLeads } from '@/hooks/useLeads';
import { getErrorMessage } from '@/lib/api';
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type Lead, type LeadStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const ALL = 'ALL';

export default function LeadsPage() {
  const { data: me } = useMe();
  const canDelete = hasRole(me, 'ADMIN', 'MANAGER');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | typeof ALL>(ALL);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useLeads({
    page,
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
  });
  const deleteLead = useDeleteLead();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLead.mutateAsync(deleting.id);
      toast.success('Lead dihapus');
      setDeleting(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader
        title="Leads & Kontak"
        description="Kelola calon pelanggan dan kontak bisnis"
        actions={
          <Button onClick={openCreate}>
            <Plus /> Tambah Lead
          </Button>
        }
      />

      <Card className="py-4">
        <CardContent className="px-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, perusahaan, telepon..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as LeadStatus | typeof ALL);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua status</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <EmptyState
              title="Belum ada lead"
              description={search || status !== ALL ? 'Coba ubah filter pencarian.' : 'Tambahkan lead pertama Anda.'}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Perusahaan</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Link to={`/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                          {lead.name}
                        </Link>
                      </TableCell>
                      <TableCell>{lead.company ?? '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.email ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{lead.phone ?? ''}</div>
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell>{lead.owner.name}</TableCell>
                      <TableCell>{formatDate(lead.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(lead)} title="Edit">
                          <Pencil />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(lead)} title="Hapus">
                            <Trash2 className="text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination meta={data.meta} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus lead?"
        description={`"${deleting?.name}" beserta seluruh aktivitasnya akan dihapus. Deal terkait tetap ada tanpa lead.`}
        loading={deleteLead.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
