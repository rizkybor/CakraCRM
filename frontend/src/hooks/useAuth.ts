import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Role, User } from '@/lib/types';

export const meQueryKey = ['auth', 'me'] as const;

/**
 * Drops every cached query belonging to the previous user and sets the session.
 * Never use queryClient.clear() here: it silently cancels an in-flight /auth/me
 * query (e.g. when a refresh fails during the initial session check) and leaves
 * the route guards stuck in their loading state.
 */
export function resetSession(qc: QueryClient, user: User | null) {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== meQueryKey[0] });
  qc.setQueryData(meQueryKey, user);
}

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
    onSuccess: (user) => resetSession(qc, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => resetSession(qc, null),
  });
}

export function hasRole(user: User | null | undefined, ...roles: Role[]) {
  return !!user && roles.includes(user.role);
}
