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
import { FormField } from '@/components/shared';
import { OwnerSelect } from '@/components/OwnerSelect';
import { hasRole, useMe } from '@/hooks/useAuth';
import { useCreateDeal, useUpdateDeal } from '@/hooks/useDeals';
import { useLeadOptions } from '@/hooks/useLeads';
import { getErrorMessage } from '@/lib/api';
import { DEAL_STAGES, DEAL_STAGE_LABEL, type Deal, type DealStage } from '@/lib/types';
import { toDateInput } from '@/lib/utils';

const NO_LEAD = 'none';

const schema = z.object({
  title: z.string().trim().min(1, 'Judul deal wajib diisi').max(150),
  value: z
    .string()
    .trim()
    .min(1, 'Nilai wajib diisi')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Nilai harus angka ≥ 0'),
  stage: z.enum(DEAL_STAGES),
  expectedCloseDate: z.string(),
  leadId: z.string(),
  ownerId: z.string(),
});

type FormValues = z.infer<typeof schema>;

const toValues = (deal?: Deal | null, defaults?: { stage?: DealStage; leadId?: string }): FormValues => ({
  title: deal?.title ?? '',
  value: deal ? String(Number(deal.value)) : '',
  stage: deal?.stage ?? defaults?.stage ?? 'LEAD_IN',
  expectedCloseDate: toDateInput(deal?.expectedCloseDate),
  leadId: deal?.leadId ?? defaults?.leadId ?? NO_LEAD,
  ownerId: deal?.ownerId ?? '',
});

export function DealFormDialog({
  open,
  onOpenChange,
  deal,
  defaultStage,
  defaultLeadId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  defaultStage?: DealStage;
  defaultLeadId?: string;
}) {
  const { data: me } = useMe();
  const canAssign = hasRole(me, 'ADMIN', 'MANAGER');
  const { data: leads = [] } = useLeadOptions();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const isEdit = !!deal;

  const { register, handleSubmit, control, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(deal, { stage: defaultStage, leadId: defaultLeadId }),
  });

  useEffect(() => {
    if (open) reset(toValues(deal, { stage: defaultStage, leadId: defaultLeadId }));
  }, [open, deal, defaultStage, defaultLeadId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      value: Number(values.value),
      stage: values.stage,
      expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate).toISOString() : null,
      leadId: values.leadId === NO_LEAD ? null : values.leadId,
      ...(canAssign && values.ownerId && { ownerId: values.ownerId }),
    };
    try {
      if (isEdit) await updateDeal.mutateAsync({ id: deal.id, ...payload });
      else await createDeal.mutateAsync(payload);
      toast.success(isEdit ? 'Deal diperbarui' : 'Deal ditambahkan');
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Deal' : 'Tambah Deal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField label="Judul *" htmlFor="title" error={formState.errors.title?.message}>
            <Input id="title" {...register('title')} aria-invalid={!!formState.errors.title} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nilai (IDR) *" htmlFor="value" error={formState.errors.value?.message}>
              <Input id="value" inputMode="numeric" {...register('value')} aria-invalid={!!formState.errors.value} />
            </FormField>
            <FormField label="Stage" htmlFor="stage">
              <Controller
                control={control}
                name="stage"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="stage">
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
                )}
              />
            </FormField>
            <FormField label="Lead terkait" htmlFor="leadId">
              <Controller
                control={control}
                name="leadId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="leadId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LEAD}>— Tanpa lead —</SelectItem>
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
            <FormField label="Target closing" htmlFor="expectedCloseDate">
              <Input id="expectedCloseDate" type="date" {...register('expectedCloseDate')} />
            </FormField>
            {canAssign && (
              <FormField label="Owner" htmlFor="ownerId">
                <Controller
                  control={control}
                  name="ownerId"
                  render={({ field }) => <OwnerSelect value={field.value} onChange={field.onChange} />}
                />
              </FormField>
            )}
          </div>
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
