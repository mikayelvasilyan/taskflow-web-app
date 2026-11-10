import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { tid } from '@/lib/testids';

export default function NotFoundPage({ inShell = false }: { inShell?: boolean }) {
  const { user } = useAuth();
  return (
    <div
      data-testid={tid.notFoundPage}
      className={
        inShell
          ? 'grid h-full place-items-center p-6'
          : 'grid min-h-dvh place-items-center bg-bg p-6'
      }
    >
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <svg width="140" height="100" viewBox="0 0 140 100" fill="none" aria-hidden>
          <rect
            x="18"
            y="16"
            width="104"
            height="70"
            rx="10"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <text
            x="70"
            y="62"
            textAnchor="middle"
            fontSize="30"
            fontWeight="600"
            fill="var(--accent)"
          >
            404
          </text>
          <circle cx="30" cy="26" r="3" fill="var(--danger)" />
          <circle cx="40" cy="26" r="3" fill="var(--warning)" />
          <circle cx="50" cy="26" r="3" fill="var(--success)" />
        </svg>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">Page not found</h1>
          <p className="text-base text-fg-muted">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>
        <div className="flex gap-2">
          {user && (
            <Button asChild variant="primary" data-testid={tid.notFoundHome}>
              <Link to="/app/dashboard">Back to dashboard</Link>
            </Button>
          )}
          <Button asChild variant={user ? 'secondary' : 'primary'}>
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
