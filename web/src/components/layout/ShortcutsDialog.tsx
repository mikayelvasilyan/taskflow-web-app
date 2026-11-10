import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useShell } from '@/hooks/useShell';
import { tid } from '@/lib/testids';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: [isMac ? '⌘' : 'Ctrl', 'K'], label: 'Open the command palette' },
  { keys: ['/'], label: 'Search' },
  { keys: ['C'], label: 'Create a task (inside a project)' },
  { keys: ['G', 'then', 'D'], label: 'Go to the dashboard' },
  { keys: ['G', 'then', 'M'], label: 'Go to my tasks' },
  { keys: ['['], label: 'Collapse or expand the sidebar' },
  { keys: ['?'], label: 'Show this list' },
  { keys: ['Esc'], label: 'Close a panel or dialog' },
  { keys: ['Space'], label: 'Pick up or drop a focused board card' },
  { keys: ['Enter'], label: 'Open a focused board card' },
];

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useShell();
  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent data-testid={tid.shortcutsDialog} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are off while you type in a field.</DialogDescription>
        </DialogHeader>
        <dl className="flex flex-col divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-base text-fg-muted">{s.label}</dt>
              <dd className="flex items-center gap-1">
                {s.keys.map((k, i) =>
                  k === 'then' ? (
                    <span key={i} className="text-xs text-fg-subtle">
                      then
                    </span>
                  ) : (
                    <kbd
                      key={i}
                      className="min-w-6 rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 text-center text-xs font-medium"
                    >
                      {k}
                    </kbd>
                  ),
                )}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
