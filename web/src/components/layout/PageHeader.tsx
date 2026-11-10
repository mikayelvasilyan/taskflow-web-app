import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  description,
  actions,
  leading,
  className,
  titleTestId,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  className?: string;
  titleTestId?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-3', className)}>
      {leading}
      <div className="min-w-0 flex-1">
        <h1 data-testid={titleTestId} className="truncate text-3xl max-md:text-2xl">
          {title}
        </h1>
        {description && <p className="mt-0.5 text-base text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Standard padded page container. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-full max-w-6xl px-4 py-6 md:px-6 md:py-8', className)}>{children}</div>
  );
}
