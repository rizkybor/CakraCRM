import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/shared';
import { useCreateActivity, useUpdateActivity } from '@/hooks/useActivities';
import { useLeadOptions } from '@/hooks/useLeads';
import { getErrorMessage } from '@/lib/api';
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABEL, type Activity } from '@/lib/types';
import { toDateTimeInput } from '@/lib/utils';

const schema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  subject: z.string().trim().min(1, 'Subjek wajib diisi').max(200),
  description: z.string().max(5000),
  dueAt: z.string(),
  leadId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity | null;
  /** Pre-link the new activity to a lead and/or deal (hides the lead picker). */
  leadId?: string | null;
  dealId?: string | null;
}

export function ActivityFormDialog({ open, onOpenChange, activity, leadId, dealId }: Props) {
  const isEdit = !!activity;
  const linked = isEdit || !!leadId || !!dealId;
  const { data: leads = [] } = useLeadOptions();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();

  const values = (): FormValues => ({
    type: activity?.type ?? 'NOTE',
    subject: activity?.subject ?? '',
    description: activity?.description ?? '',
    dueAt: toDateTimeInput(activity?.dueAt),
    leadId: activity?.leadId ?? leadId ?? '',
  });

  const { register, handleSubmit, control, reset, formState, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: values(),
  });

  useEffect(() => {
    if (open) reset(values());
  }, [open, activity, leadId, dealId]);

  const onSubmit = handleSubmit(async (v) => {
    const common = {
      type: v.type,
      subject: v.subject,
      description: v.description || null,
      dueAt: v.dueAt ? new Date(v.dueAt).toISOString() : null,
    };
    try {
      if (isEdit) {
        await updateActivity.mutateAsync({ id: activity.id, ...common });
      } else {
        const targetLead = leadId ?? (v.leadId || null);
        if (!targetLead && !dealId) {
          setError('leadId', { message: 'Pilih lead terkait' });
          return;
        }
        await createActivity.mutateAsync({ ...common, leadId: targetLead, dealId: dealId ?? null });
      }
      toast.success(isEdit ? 'Aktivitas diperbarui' : 'Aktivitas dicatat');
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Aktivitas' : 'Catat Aktivitas'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tipe" htmlFor="type">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACTIVITY_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Jadwal / Tenggat" htmlFor="dueAt">
              <Input id="dueAt" type="datetime-local" {...register('dueAt')} />
            </FormField>
          </div>
          {!linked && (
            <FormField label="Lead terkait *" htmlFor="leadId" error={formState.errors.leadId?.message}>
              <Controller
                control={control}
                name="leadId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="leadId" aria-invalid={!!formState.errors.leadId}>
                      <SelectValue placeholder="Pilih lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                          {l.company ? ` · ${l.company}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField label="Subjek *" htmlFor="subject" error={formState.errors.subject?.message}>
            <Input id="subject" {...register('subject')} aria-invalid={!!formState.errors.subject} />
          </FormField>
          <FormField label="Detail" htmlFor="description" error={formState.errors.description?.message}>
            <Textarea id="description" rows={4} {...register('description')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
