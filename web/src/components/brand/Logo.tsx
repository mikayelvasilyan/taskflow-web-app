import { cn } from '@/lib/cn';

/** Rounded accent square with three bars flowing forward. */
export function Logo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="TaskFlow logo"
      className={cn('shrink-0', className)}
    >
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <rect x="5" y="6" width="9" height="2.6" rx="1.3" fill="#fff" />
      <rect x="8" y="10.7" width="9" height="2.6" rx="1.3" fill="#fff" />
      <rect x="11" y="15.4" width="8" height="2.6" rx="1.3" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-xl font-semibold tracking-[-0.02em] text-fg', className)}>
      Task<span className="text-accent-fg">Flow</span>
    </span>
  );
}

export function BrandLockup({
  className,
  iconSize = 26,
}: {
  className?: string;
  iconSize?: number;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Logo size={iconSize} />
      <Wordmark />
    </span>
  );
}
