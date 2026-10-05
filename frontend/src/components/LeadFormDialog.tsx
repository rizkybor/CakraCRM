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
import { OwnerSelect } from '@/components/OwnerSelect';
import { hasRole, useMe } from '@/hooks/useAuth';
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { getErrorMessage } from '@/lib/api';
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type Lead } from '@/lib/types';

const schema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  email: z.union([z.literal(''), z.email('Email tidak valid').max(254)]),
  phone: z.string().trim().max(30).regex(/^[0-9+()\-.\s]*$/, 'Nomor telepon tidak valid'),
  company: z.string().trim().max(120),
  status: z.enum(LEAD_STATUSES),
  source: z.string().trim().max(60),
  notes: z.string().max(5000),
  ownerId: z.string(),
});

type FormValues = z.infer<typeof schema>;

const toValues = (lead?: Lead | null): FormValues => ({
  name: lead?.name ?? '',
  email: lead?.email ?? '',
  phone: lead?.phone ?? '',
  company: lead?.company ?? '',
  status: lead?.status ?? 'NEW',
  source: lead?.source ?? '',
  notes: lead?.notes ?? '',
  ownerId: lead?.ownerId ?? '',
});

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}) {
  const { data: me } = useMe();
  const canAssign = hasRole(me, 'ADMIN', 'MANAGER');
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const isEdit = !!lead;

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(lead) });
  const { register, handleSubmit, control, reset, formState } = form;

  useEffect(() => {
    if (open) reset(toValues(lead));
  }, [open, lead, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      company: values.company || null,
      status: values.status,
      source: values.source || null,
      notes: values.notes || null,
      ...(canAssign && values.ownerId && { ownerId: values.ownerId }),
    };
    try {
      if (isEdit) await updateLead.mutateAsync({ id: lead.id, ...payload });
      else await createLead.mutateAsync(payload);
      toast.success(isEdit ? 'Lead diperbarui' : 'Lead ditambahkan');
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lead' : 'Tambah Lead / Kontak'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nama *" htmlFor="name" error={formState.errors.name?.message}>
              <Input id="name" {...register('name')} aria-invalid={!!formState.errors.name} />
            </FormField>
            <FormField label="Perusahaan" htmlFor="company" error={formState.errors.company?.message}>
              <Input id="company" {...register('company')} />
            </FormField>
            <FormField label="Email" htmlFor="email" error={formState.errors.email?.message}>
              <Input id="email" type="email" {...register('email')} aria-invalid={!!formState.errors.email} />
            </FormField>
            <FormField label="Telepon" htmlFor="phone" error={formState.errors.phone?.message}>
              <Input id="phone" {...register('phone')} aria-invalid={!!formState.errors.phone} />
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEAD_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Sumber" htmlFor="source" error={formState.errors.source?.message}>
              <Input id="source" placeholder="Website, Referral, Event..." {...register('source')} />
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
          <FormField label="Catatan" htmlFor="notes" error={formState.errors.notes?.message}>
            <Textarea id="notes" rows={3} {...register('notes')} />
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
