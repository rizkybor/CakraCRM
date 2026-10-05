import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Lead, LeadDetail, LeadStatus, Paginated } from '@/lib/types';

export interface LeadFilters {
  page: number;
  pageSize?: number;
  search?: string;
  status?: LeadStatus;
}

export interface LeadInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: LeadStatus;
  source?: string | null;
  notes?: string | null;
  ownerId?: string;
}

const keys = {
  all: ['leads'] as const,
  list: (f: LeadFilters) => ['leads', 'list', f] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
};

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => (await api.get<Paginated<Lead>>('/leads', { params: filters })).data,
    placeholderData: keepPreviousData,
  });
}

/** Lightweight list used by lead pickers in deal/activity forms. */
export function useLeadOptions() {
  return useQuery({
    queryKey: ['leads', 'options'],
    queryFn: async () =>
      (await api.get<Paginated<Lead>>('/leads', { params: { pageSize: 100, sortBy: 'name', sortOrder: 'asc' } })).data
        .data,
    staleTime: 60_000,
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: async () => (await api.get<{ data: LeadDetail }>(`/leads/${id}`)).data.data,
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: keys.all });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: LeadInput) => (await api.post<{ data: Lead }>('/leads', input)).data.data,
    onSuccess: invalidate,
  });
}

export function useUpdateLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<LeadInput> & { id: string }) =>
      (await api.patch<{ data: Lead }>(`/leads/${id}`, input)).data.data,
    onSuccess: invalidate,
  });
}

export function useDeleteLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: invalidate,
  });
}
