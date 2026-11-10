import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';
import { tid } from '@/lib/testids';

export function FullScreenLoader() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-testid={tid.skeleton('app')}
      className="grid min-h-dvh place-items-center bg-bg"
    >
      <Logo size={36} className="animate-pulse-soft" />
    </div>
  );
}

/** Sends signed-out visitors to /login and remembers where they were going. */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Login/signup are for signed-out visitors only. */
export function GuestRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}
