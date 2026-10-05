import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { CheckCircle2, Circle, ListTodo, MessageSquareText, Pencil, Phone, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import { ActivityFormDialog } from '@/components/ActivityFormDialog';
import { hasRole, useMe } from '@/hooks/useAuth';
import { useDeleteActivity, useUpdateActivity } from '@/hooks/useActivities';
import { getErrorMessage } from '@/lib/api';
import { ACTIVITY_TYPE_LABEL, type Activity, type ActivityType } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

const ICONS: Record<ActivityType, typeof Phone> = {
  CALL: Phone,
  MEETING: Users,
  NOTE: MessageSquareText,
  TASK: ListTodo,
};

export function ActivityTimeline({ activities, showLinks = false }: { activities: Activity[]; showLinks?: boolean }) {
  const { data: me } = useMe();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);

  const canEdit = (a: Activity) => hasRole(me, 'ADMIN', 'MANAGER') || a.userId === me?.id;

  const toggleComplete = async (a: Activity) => {
    try {
      await updateActivity.mutateAsync({ id: a.id, completed: !a.completedAt });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteActivity.mutateAsync(deleting.id);
      toast.success('Aktivitas dihapus');
      setDeleting(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (activities.length === 0) {
    return <EmptyState title="Belum ada aktivitas" description="Catat panggilan, meeting, atau catatan pertama." />;
  }

  return (
    <>
      <ol className="relative space-y-4 border-l pl-6">
        {activities.map((a) => {
          const Icon = ICONS[a.type];
          const isTask = a.type === 'TASK' || !!a.dueAt;
          return (
            <li key={a.id} className="relative">
              <span className="absolute -left-[37px] flex size-6 items-center justify-center rounded-full border bg-card">
                <Icon className="size-3.5 text-primary" />
              </span>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{ACTIVITY_TYPE_LABEL[a.type]}</Badge>
                      <p className={cn('font-medium', a.completedAt && isTask && 'text-muted-foreground line-through')}>
                        {a.subject}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.user.name} · {formatDate(a.createdAt, true)}
                      {a.dueAt && <> · Jadwal: {formatDate(a.dueAt, true)}</>}
                    </p>
                    {showLinks && (a.lead || a.deal) && (
                      <p className="mt-1 text-xs">
                        {a.lead && (
                          <Link to={`/leads/${a.lead.id}`} className="text-primary hover:underline">
                            {a.lead.name}
                          </Link>
                        )}
                        {a.lead && a.deal && ' · '}
                        {a.deal && (
                          <Link to={`/deals/${a.deal.id}`} className="text-primary hover:underline">
                            {a.deal.title}
                          </Link>
                        )}
                      </p>
                    )}
                  </div>
                  {canEdit(a) && (
                    <div className="flex gap-1">
                      {isTask && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleComplete(a)}
                          title={a.completedAt ? 'Tandai belum selesai' : 'Tandai selesai'}
                        >
                          {a.completedAt ? <CheckCircle2 className="text-emerald-600" /> : <Circle />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setEditing(a)} title="Edit">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(a)} title="Hapus">
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                {a.description && <p className="mt-2 text-sm whitespace-pre-wrap">{a.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <ActivityFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} activity={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus aktivitas?"
        description="Aktivitas yang dihapus tidak dapat dikembalikan."
        loading={deleteActivity.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
