import { Navigate, Outlet, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { hasRole, useMe } from '@/hooks/useAuth';
import type { Role } from '@/lib/types';

function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}

/** Requires an authenticated session; otherwise redirects to /login. */
export function ProtectedRoute() {
  const { data: user, isLoading } = useMe();
  const location = useLocation();
  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Only renders nested routes for the given roles. */
export function RoleGuard({ roles }: { roles: Role[] }) {
  const { data: user } = useMe();
  if (!hasRole(user, ...roles)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}

/** Login page should bounce already-authenticated users to the dashboard. */
export function GuestRoute() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <FullPageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
