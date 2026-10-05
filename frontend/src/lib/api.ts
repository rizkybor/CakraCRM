import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
  // Send the HTTP-only auth cookies cross-origin.
  withCredentials: true,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    // Required by the backend's CSRF guard on state-changing requests.
    'X-Requested-With': 'XMLHttpRequest',
  },
});

interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: { path: string; message: string }[];
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

let refreshPromise: Promise<void> | null = null;
let onSessionExpired: (() => void) | null = null;

/** Registered by the app to clear cached user data and go to /login. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

/** Single-flight refresh: concurrent 401s wait on the same refresh call. */
function refreshSession() {
  refreshPromise ??= api
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isAuthCall = AUTH_PATHS.some((p) => original?.url?.startsWith(p));

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch (refreshError) {
        onSessionExpired?.();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (body?.errors?.length) return body.errors.map((e) => e.message).join(', ');
    if (body?.message) return body.message;
    if (error.code === 'ERR_NETWORK') return 'Tidak dapat terhubung ke server.';
  }
  return fallback;
}
