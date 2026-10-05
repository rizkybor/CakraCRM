import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader, Pagination } from '@/components/shared';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ActivityFormDialog } from '@/components/ActivityFormDialog';
import { useActivities } from '@/hooks/useActivities';
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABEL, type ActivityType } from '@/lib/types';

const ALL = 'ALL';
type StatusFilter = typeof ALL | 'open' | 'completed';

export default function ActivitiesPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<ActivityType | typeof ALL>(ALL);
  const [status, setStatus] = useState<StatusFilter>(ALL);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useActivities({
    page,
    type: type === ALL ? undefined : type,
    status: status === ALL ? undefined : status,
  });

  return (
    <>
      <PageHeader
        title="Aktivitas & Tugas"
        description="Riwayat interaksi pelanggan: panggilan, meeting, catatan, dan tugas"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Catat Aktivitas
          </Button>
        }
      />

      <Card className="py-4">
        <CardContent className="px-4">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ActivityType | typeof ALL);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua tipe</SelectItem>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACTIVITY_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua status</SelectItem>
                <SelectItem value="open">Belum selesai</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <>
              <ActivityTimeline activities={data.data} showLinks />
              <Pagination meta={data.meta} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <ActivityFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}
