import { Command } from 'cmdk';
import {
  FolderKanban,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Moon,
  Plus,
  Search,
  SquarePlus,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { useSearch } from '@/api/queries/misc';
import { PriorityIcon } from '@/components/tasks/badges';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useShell } from '@/hooks/useShell';
import { useTheme } from '@/hooks/useTheme';
import { tid } from '@/lib/testids';

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-base text-fg aria-selected:bg-surface-2';

function Item({
  name,
  icon: Icon,
  children,
  onSelect,
  value,
}: {
  name: string;
  icon?: LucideIcon;
  children: ReactNode;
  onSelect: () => void;
  value: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      data-testid={tid.commandItem(name)}
      className={itemClass}
    >
      {Icon && <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />}
      {children}
    </Command.Item>
  );
}

const heading =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle';

/** Ctrl/Cmd + K: jump to projects and tasks, or run an action. */
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setShortcutsOpen, setNewProjectOpen, openNewTask } =
    useShell();
  const { toggle } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const inProject = useMatch('/app/projects/:projectId/*');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const results = useSearch(debounced);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!paletteOpen) setQuery('');
  }, [paletteOpen]);

  const run = (fn: () => void) => () => {
    setPaletteOpen(false);
    fn();
  };

  const needle = query.trim().toLowerCase();
  const actions: {
    name: string;
    label: string;
    icon: LucideIcon;
    run: () => void;
    show?: boolean;
  }[] = [
    {
      name: 'new-task',
      label: 'New task',
      icon: SquarePlus,
      run: () => openNewTask('todo'),
      show: !!inProject,
    },
    { name: 'new-project', label: 'New project', icon: Plus, run: () => setNewProjectOpen(true) },
    {
      name: 'dashboard',
      label: 'Go to dashboard',
      icon: LayoutDashboard,
      run: () => navigate('/app/dashboard'),
    },
    {
      name: 'my-tasks',
      label: 'Go to my tasks',
      icon: ListChecks,
      run: () => navigate('/app/my-tasks'),
    },
    { name: 'toggle-theme', label: 'Toggle theme', icon: Moon, run: toggle },
    {
      name: 'shortcuts',
      label: 'Keyboard shortcuts',
      icon: Keyboard,
      run: () => setShortcutsOpen(true),
    },
    {
      name: 'logout',
      label: 'Log out',
      icon: LogOut,
      run: () => void logout().then(() => navigate('/login', { replace: true })),
    },
  ].filter((a) => a.show !== false && (!needle || a.label.toLowerCase().includes(needle)));

  const found = results.data;
  const hasResults = !!found && (found.projects.length > 0 || found.tasks.length > 0);

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent
        showClose={false}
        data-testid={tid.commandPalette}
        className="top-[18%] max-w-xl translate-y-0 gap-0 p-0 md:top-[18%] max-md:top-auto"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search projects and tasks or run a command
        </DialogDescription>
        <Command shouldFilter={false} label="Command palette" loop>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search projects, tasks or commands"
              data-testid={tid.commandPaletteInput}
              className="h-12 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>
          <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {query.trim() && results.isFetched && !hasResults && actions.length === 0 && (
              <Command.Empty className="px-3 py-8 text-center text-base text-fg-muted">
                No results for “{query.trim()}”.
              </Command.Empty>
            )}
            {found && found.projects.length > 0 && (
              <Command.Group heading="Projects" className={heading}>
                {found.projects.map((p) => (
                  <Item
                    key={p.id}
                    name={`project-${p.id}`}
                    value={`project-${p.id}`}
                    icon={FolderKanban}
                    onSelect={run(() => navigate(`/app/projects/${p.id}/board`))}
                  >
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="tabular text-xs text-fg-subtle">{p.key}</span>
                  </Item>
                ))}
              </Command.Group>
            )}
            {found && found.tasks.length > 0 && (
              <Command.Group heading="Tasks" className={heading}>
                {found.tasks.map((t) => (
                  <Item
                    key={t.id}
                    name={`task-${t.id}`}
                    value={`task-${t.id}`}
                    onSelect={run(() =>
                      navigate(`/app/projects/${t.projectId}/board?task=${t.id}`),
                    )}
                  >
                    <PriorityIcon priority={t.priority} />
                    <span className="tabular w-16 shrink-0 text-xs text-fg-subtle">{t.key}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                  </Item>
                ))}
              </Command.Group>
            )}
            {actions.length > 0 && (
              <Command.Group heading="Actions" className={heading}>
                {actions.map((a) => (
                  <Item
                    key={a.name}
                    name={a.name}
                    value={`action-${a.name}`}
                    icon={a.icon}
                    onSelect={run(a.run)}
                  >
                    {a.label}
                  </Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
