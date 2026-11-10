import { cn } from '@/lib/cn';

export interface PersonLike {
  name: string;
  avatarColor: string;
}

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

const sizes = {
  xs: 'size-5 text-[10px]',
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
};

/** Initials on one of the fixed AA-safe brand colours. */
export function Avatar({
  person,
  size = 'sm',
  className,
  ...props
}: {
  person: PersonLike;
  size?: keyof typeof sizes;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <span
      role="img"
      aria-label={person.name}
      title={person.name}
      style={{ backgroundColor: person.avatarColor }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface',
        sizes[size],
        className,
      )}
      {...props}
    >
      {initialsOf(person.name)}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: PersonLike[]; max?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="inline-flex -space-x-1">
      {shown.map((p, i) => (
        <span
          key={`${p.name}-${i}`}
          className="relative inline-flex"
          style={{ zIndex: shown.length - i }}
        >
          <Avatar person={p} size="sm" />
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-fg-muted ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </span>
  );
}
