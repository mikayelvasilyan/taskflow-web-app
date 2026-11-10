import { Label as LabelPrimitive } from 'radix-ui';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root className={cn('text-sm font-medium text-fg', className)} {...props} />
  );
}

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string;
  errorTestId?: string;
  className?: string;
  /** Render-prop receives the ids to wire label, description and error to the control. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Label + control + inline validation message, wired for screen readers. */
export function Field({ label, error, hint, errorTestId, className, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          data-testid={errorTestId}
          className="text-xs font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
