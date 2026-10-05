import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Activity, ActivityType, Paginated } from '@/lib/types';

export interface ActivityFilters {
  page: number;
  pageSize?: number;
  type?: ActivityType;
  status?: 'open' | 'completed';
  leadId?: string;
  dealId?: string;
}

export interface ActivityInput {
  type: ActivityType;
  subject: string;
  description?: string | null;
  dueAt?: string | null;
  completed?: boolean;
  leadId?: string | null;
  dealId?: string | null;
}

export function useActivities(filters: ActivityFilters) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: async () => (await api.get<Paginated<Activity>>('/activities', { params: filters })).data,
    placeholderData: keepPreviousData,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['activities'] });
    // Lead/deal detail pages embed their activity timeline.
    void qc.invalidateQueries({ queryKey: ['leads', 'detail'] });
    void qc.invalidateQueries({ queryKey: ['deals'] });
  };
}

export function useCreateActivity() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: ActivityInput) =>
      (await api.post<{ data: Activity }>('/activities', input)).data.data,
    onSuccess: invalidate,
  });
}

export function useUpdateActivity() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Omit<ActivityInput, 'leadId' | 'dealId'>> & { id: string }) =>
      (await api.patch<{ data: Activity }>(`/activities/${id}`, input)).data.data,
    onSuccess: invalidate,
  });
}

export function useDeleteActivity() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/activities/${id}`),
    onSuccess: invalidate,
  });
}
