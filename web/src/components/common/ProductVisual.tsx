import { CheckCircle2, Circle, CircleDashed } from 'lucide-react';
import type { Priority } from '@/api/client';
import { PriorityIcon } from '@/components/tasks/badges';
import { cn } from '@/lib/cn';

interface Sample {
  key: string;
  title: string;
  label: { name: string; color: string };
  priority: Priority;
  due: string;
  dueClass?: string;
  who: { initials: string; color: string };
}

const COLS: { title: string; icon: React.ReactNode; cards: Sample[] }[] = [
  {
    title: 'To do',
    icon: <Circle className="size-3.5 text-fg-subtle" aria-hidden />,
    cards: [
      {
        key: 'WEB-14',
        title: 'Redirect map for old URLs',
        label: { name: 'backend', color: '#0E7490' },
        priority: 'high',
        due: '3 days overdue',
        dueClass: 'text-danger font-medium',
        who: { initials: 'JW', color: '#475569' },
      },
      {
        key: 'WEB-12',
        title: 'Accessibility review with screen reader',
        label: { name: 'research', color: '#16A34A' },
        priority: 'high',
        due: 'Today',
        dueClass: 'text-warning font-medium',
        who: { initials: 'SR', color: '#0E7490' },
      },
    ],
  },
  {
    title: 'In progress',
    icon: <CircleDashed className="size-3.5 text-accent-fg" aria-hidden />,
    cards: [
      {
        key: 'WEB-7',
        title: 'Build responsive navigation',
        label: { name: 'frontend', color: '#2F5BEA' },
        priority: 'high',
        due: 'in 2 days',
        who: { initials: 'JW', color: '#475569' },
      },
      {
        key: 'WEB-8',
        title: 'Design pricing page layout',
        label: { name: 'design', color: '#7C3AED' },
        priority: 'medium',
        due: 'in 4 days',
        who: { initials: 'PS', color: '#C2410C' },
      },
    ],
  },
  {
    title: 'Done',
    icon: <CheckCircle2 className="size-3.5 text-success" aria-hidden />,
    cards: [
      {
        key: 'WEB-3',
        title: 'Set up component library in Storybook',
        label: { name: 'frontend', color: '#2F5BEA' },
        priority: 'medium',
        due: 'Nov 3',
        who: { initials: 'JW', color: '#475569' },
      },
    ],
  },
];

/** A static, decorative miniature of the board for the auth screens. Mirrors the real card anatomy. */
export function ProductVisual({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'grid grid-cols-3 gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-lg',
        className,
      )}
    >
      {COLS.map((c) => (
        <div key={c.title} className="flex flex-col gap-2 rounded-lg bg-surface-2 p-2">
          <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-fg-muted">
            {c.icon}
            {c.title}
            <span className="ml-auto tabular text-fg-subtle">{c.cards.length}</span>
          </div>
          {c.cards.map((card) => (
            <div
              key={card.key}
              className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-2 shadow-xs"
            >
              <span className="tabular text-[10px] font-medium text-fg-subtle">{card.key}</span>
              <p className="text-xs font-medium leading-4 text-fg">{card.title}</p>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: card.label.color }}
                />
                {card.label.name}
              </span>
              <div className="flex items-center gap-1.5">
                <PriorityIcon priority={card.priority} className="size-3.5" />
                <span className={cn('tabular text-[10px] text-fg-muted', card.dueClass)}>
                  {card.due}
                </span>
                <span
                  className="ml-auto inline-flex size-4 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                  style={{ backgroundColor: card.who.color }}
                >
                  {card.who.initials}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
