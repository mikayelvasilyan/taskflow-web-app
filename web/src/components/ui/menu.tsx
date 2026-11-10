import { Check, ChevronDown } from 'lucide-react';
import { DropdownMenu as Dd, Popover as Pop, Select as Sel, Tooltip as Tip } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const surface =
  'z-[60] min-w-44 overflow-hidden rounded-lg border border-border bg-surface p-1 text-base text-fg shadow-md data-[state=open]:animate-pop-in';
const itemBase =
  'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-base outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-2';

/* ---------- Dropdown menu ---------- */
export const DropdownMenu = Dd.Root;
export const DropdownMenuTrigger = Dd.Trigger;

export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof Dd.Content>) {
  return (
    <Dd.Portal>
      <Dd.Content sideOffset={6} align="end" className={cn(surface, className)} {...props} />
    </Dd.Portal>
  );
}

export function DropdownMenuItem({
  className,
  danger,
  ...props
}: ComponentProps<typeof Dd.Item> & { danger?: boolean }) {
  return <Dd.Item className={cn(itemBase, danger && 'text-danger', className)} {...props} />;
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Dd.Label>) {
  return (
    <Dd.Label
      className={cn('px-2.5 py-1.5 text-xs font-medium text-fg-muted', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Dd.Separator>) {
  return <Dd.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

/* ---------- Popover ---------- */
export const Popover = Pop.Root;
export const PopoverTrigger = Pop.Trigger;
export function PopoverContent({ className, ...props }: ComponentProps<typeof Pop.Content>) {
  return (
    <Pop.Portal>
      <Pop.Content
        sideOffset={6}
        align="start"
        className={cn(surface, 'p-3', className)}
        {...props}
      />
    </Pop.Portal>
  );
}

/* ---------- Tooltip ---------- */
export const TooltipProvider = Tip.Provider;
export function Tooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Tip.Root delayDuration={300}>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content
          sideOffset={6}
          className="z-[70] rounded-md bg-fg px-2 py-1 text-xs font-medium text-bg shadow-md data-[state=delayed-open]:animate-pop-in"
        >
          {label}
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  );
}

/* ---------- Select ---------- */
export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  placeholder?: string;
  'aria-label'?: string;
  'aria-describedby'?: string | undefined;
  'data-testid'?: string;
  className?: string;
  disabled?: boolean;
  /** Visual style: bordered field or borderless inline value. */
  variant?: 'field' | 'inline';
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  variant = 'field',
  disabled,
  'data-testid': testId,
  ...aria
}: SelectProps) {
  return (
    <Sel.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Sel.Trigger
        data-testid={testId}
        className={cn(
          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-md px-3 text-base text-fg transition-colors disabled:opacity-60 max-md:h-10',
          variant === 'field'
            ? 'border border-border-strong bg-surface shadow-xs hover:border-fg-subtle'
            : 'h-8 -mx-2 w-auto px-2 hover:bg-surface-2',
          className,
        )}
        {...aria}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <Sel.Value placeholder={placeholder} />
        </span>
        <Sel.Icon>
          <ChevronDown className="size-4 text-fg-muted" aria-hidden />
        </Sel.Icon>
      </Sel.Trigger>
      <Sel.Portal>
        <Sel.Content
          position="popper"
          sideOffset={6}
          className={cn(surface, 'max-h-72 min-w-[var(--radix-select-trigger-width)]')}
        >
          <Sel.Viewport>
            {options.map((o) => (
              <Sel.Item
                key={o.value}
                value={o.value}
                data-testid={testId ? `${testId}-option-${o.value}` : undefined}
                className={cn(itemBase, 'pr-8')}
              >
                <Sel.ItemText>
                  <span className="flex items-center gap-2">
                    {o.icon}
                    {o.label}
                  </span>
                </Sel.ItemText>
                <Sel.ItemIndicator className="absolute right-2">
                  <Check className="size-4 text-accent-fg" aria-hidden />
                </Sel.ItemIndicator>
              </Sel.Item>
            ))}
          </Sel.Viewport>
        </Sel.Content>
      </Sel.Portal>
    </Sel.Root>
  );
}
