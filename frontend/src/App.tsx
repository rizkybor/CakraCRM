import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { GuestRoute, ProtectedRoute, RoleGuard } from '@/components/auth/guards';
import { AppLayout } from '@/components/layout/AppLayout';
import { meQueryKey } from '@/hooks/useAuth';
import { setSessionExpiredHandler } from '@/lib/api';
import LoginPage from '@/pages/LoginPage';
import { ForbiddenPage, NotFoundPage } from '@/pages/StatusPages';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LeadsPage = lazy(() => import('@/pages/LeadsPage'));
const LeadDetailPage = lazy(() => import('@/pages/LeadDetailPage'));
const PipelinePage = lazy(() => import('@/pages/PipelinePage'));
const DealDetailPage = lazy(() => import('@/pages/DealDetailPage'));
const ActivitiesPage = lazy(() => import('@/pages/ActivitiesPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));

function PageSuspense() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            element: <PageSuspense />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'leads', element: <LeadsPage /> },
              { path: 'leads/:id', element: <LeadDetailPage /> },
              { path: 'pipeline', element: <PipelinePage /> },
              { path: 'deals/:id', element: <DealDetailPage /> },
              { path: 'activities', element: <ActivitiesPage /> },
              {
                element: <RoleGuard roles={['ADMIN']} />,
                children: [{ path: 'users', element: <UsersPage /> }],
              },
              { path: 'forbidden', element: <ForbiddenPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export default function App() {
  const qc = useQueryClient();

  useEffect(() => {
    // When the refresh token is rejected, drop all cached data; ProtectedRoute
    // then redirects to /login because the session query becomes null.
    setSessionExpiredHandler(() => {
      qc.clear();
      qc.setQueryData(meQueryKey, null);
    });
  }, [qc]);

  return <RouterProvider router={router} />;
}
