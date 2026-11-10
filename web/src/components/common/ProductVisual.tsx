import { CheckCircle2, Circle, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/cn';

const COLS = [
  {
    title: 'To do',
    icon: <Circle className="size-3.5 text-fg-subtle" aria-hidden />,
    cards: [
      { t: 'Redirect map for old URLs', tag: 'backend', bar: 'bg-warning' },
      { t: 'Accessibility review', tag: 'research', bar: 'bg-accent' },
    ],
  },
  {
    title: 'In progress',
    icon: <CircleDashed className="size-3.5 text-accent-fg" aria-hidden />,
    cards: [
      { t: 'Build responsive navigation', tag: 'frontend', bar: 'bg-accent' },
      { t: 'Fix checkout contrast', tag: 'bug', bar: 'bg-danger' },
    ],
  },
  {
    title: 'Done',
    icon: <CheckCircle2 className="size-3.5 text-success" aria-hidden />,
    cards: [{ t: 'Set up component library', tag: 'frontend', bar: 'bg-success' }],
  },
];

/** A static, decorative miniature of the board for auth screens and the landing page. */
export function ProductVisual({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'grid grid-cols-3 gap-3 rounded-xl border border-border bg-surface p-3 shadow-lg',
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
              key={card.t}
              className="rounded-md border border-border bg-surface p-2.5 shadow-xs"
            >
              <p className="text-xs font-medium leading-4 text-fg">{card.t}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-fg">
                  {card.tag}
                </span>
                <span className={cn('ml-auto h-1.5 w-6 rounded-full', card.bar)} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
