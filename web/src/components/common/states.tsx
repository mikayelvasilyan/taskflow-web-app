import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { tid } from '@/lib/testids';
import { cn } from '@/lib/cn';

type Art = 'tasks' | 'projects' | 'search' | 'done' | 'members';

/** Small inline illustrations drawn with theme tokens so they work in both themes. */
function Illustration({ art }: { art: Art }) {
  const common = {
    width: 120,
    height: 88,
    viewBox: '0 0 120 88',
    fill: 'none',
    'aria-hidden': true,
  } as const;
  switch (art) {
    case 'projects':
      return (
        <svg {...common}>
          <rect
            x="14"
            y="22"
            width="92"
            height="52"
            rx="8"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <rect x="14" y="22" width="36" height="12" rx="6" fill="var(--accent-soft)" />
          <rect x="26" y="46" width="68" height="6" rx="3" fill="var(--border-strong)" />
          <rect x="26" y="58" width="44" height="6" rx="3" fill="var(--border)" />
          <circle cx="98" cy="20" r="9" fill="var(--accent)" />
          <path d="M98 15v10M93 20h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle
            cx="52"
            cy="40"
            r="22"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
            strokeWidth="2"
          />
          <path d="M69 57l18 18" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" />
          <path d="M42 40h20" stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'done':
      return (
        <svg {...common}>
          <circle cx="60" cy="44" r="30" fill="var(--success-soft)" />
          <circle cx="60" cy="44" r="20" fill="var(--success)" opacity="0.18" />
          <path
            d="M48 45l9 9 16-18"
            stroke="var(--success)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'members':
      return (
        <svg {...common}>
          <circle cx="44" cy="34" r="14" fill="var(--accent-soft)" stroke="var(--border-strong)" />
          <circle cx="78" cy="38" r="12" fill="var(--surface-2)" stroke="var(--border-strong)" />
          <path
            d="M20 72c2-14 12-20 24-20s22 6 24 20"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <path
            d="M70 72c1-9 6-14 14-14s14 5 16 14"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect
            x="22"
            y="14"
            width="76"
            height="62"
            rx="10"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <rect
            x="34"
            y="28"
            width="12"
            height="12"
            rx="3"
            fill="var(--accent-soft)"
            stroke="var(--accent)"
          />
          <rect x="54" y="31" width="32" height="6" rx="3" fill="var(--border-strong)" />
          <rect
            x="34"
            y="50"
            width="12"
            height="12"
            rx="3"
            fill="var(--surface)"
            stroke="var(--border-strong)"
          />
          <rect x="54" y="53" width="24" height="6" rx="3" fill="var(--border)" />
        </svg>
      );
  }
}

export function EmptyState({
  name,
  art = 'tasks',
  title,
  description,
  action,
  className,
}: {
  name: string;
  art?: Art;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-testid={tid.emptyState(name)}
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <Illustration art={art} />
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="max-w-sm text-base text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  name,
  message = 'Something went wrong while loading this.',
  onRetry,
}: {
  name: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      data-testid={tid.errorState(name)}
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <p className="text-base text-fg-muted">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} data-testid={tid.retry(name)}>
          Try again
        </Button>
      )}
    </div>
  );
}
