import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Role, User } from '@/lib/types';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export type UpdateUserInput = Partial<CreateUserInput> & { isActive?: boolean };

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<{ data: User[] }>('/users')).data.data,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => (await api.post<{ data: User }>('/users', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateUserInput & { id: string }) =>
      (await api.patch<{ data: User }>(`/users/${id}`, input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
