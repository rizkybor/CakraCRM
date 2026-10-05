import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Deal, DealDetail, DealStage } from '@/lib/types';

export interface DealInput {
  title: string;
  value: number;
  stage: DealStage;
  expectedCloseDate?: string | null;
  leadId?: string | null;
  ownerId?: string;
}

const listKey = (search?: string) => ['deals', 'list', search ?? ''] as const;

export function useDeals(search?: string) {
  return useQuery({
    queryKey: listKey(search),
    queryFn: async () => (await api.get<{ data: Deal[] }>('/deals', { params: { search: search || undefined } })).data.data,
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ['deals', 'detail', id],
    queryFn: async () => (await api.get<{ data: DealDetail }>(`/deals/${id}`)).data.data,
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['deals'] });
    void qc.invalidateQueries({ queryKey: ['leads'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateDeal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: DealInput) => (await api.post<{ data: Deal }>('/deals', input)).data.data,
    onSuccess: invalidate,
  });
}

export function useUpdateDeal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<DealInput> & { id: string }) =>
      (await api.patch<{ data: Deal }>(`/deals/${id}`, input)).data.data,
    onSuccess: invalidate,
  });
}

/** Optimistic stage change so the Kanban card moves instantly. */
export function useUpdateDealStage(search?: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  const key = listKey(search);
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: DealStage }) =>
      (await api.patch<{ data: Deal }>(`/deals/${id}/stage`, { stage })).data.data,
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Deal[]>(key);
      qc.setQueryData<Deal[]>(key, (old) => old?.map((d) => (d.id === id ? { ...d, stage } : d)));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: invalidate,
  });
}

export function useDeleteDeal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${id}`),
    onSuccess: invalidate,
  });
}
