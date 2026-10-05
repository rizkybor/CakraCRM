import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Role, User } from '@/lib/types';

export const meQueryKey = ['auth', 'me'] as const;

/** Session check: null means "not logged in". */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<User | null> => {
      try {
        const { data } = await api.get<{ user: User }>('/auth/me');
        return data.user;
      } catch (error) {
        // The interceptor already attempted a refresh; a remaining 401 means logged out.
        if ((error as { response?: { status?: number } }).response?.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { data } = await api.post<{ user: User }>('/auth/login', input);
      return data.user;
    },
    onSuccess: (user) => {
      qc.clear();
      qc.setQueryData(meQueryKey, user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(meQueryKey, null);
    },
  });
}

export function hasRole(user: User | null | undefined, ...roles: Role[]) {
  return !!user && roles.includes(user.role);
}
