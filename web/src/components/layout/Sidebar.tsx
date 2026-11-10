import {
  LayoutDashboard,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useProjects } from '@/api/queries/projects';
import { BrandLockup, Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/menu';
import { Skeleton } from '@/components/ui/misc';
import { useShell } from '@/hooks/useShell';
import { cn } from '@/lib/cn';
import { tid } from '@/lib/testids';

const linkClass =
  (collapsed: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-base font-medium transition-colors',
      collapsed && 'justify-center px-0',
      isActive ? 'bg-accent-soft text-accent-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
    );

function NavItem({
  to,
  icon,
  label,
  collapsed,
  testId,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  testId: string;
}) {
  const link = (
    <NavLink
      to={to}
      className={linkClass(collapsed)}
      data-testid={testId}
      aria-label={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
  return collapsed ? <Tooltip label={label}>{link}</Tooltip> : link;
}

export function Sidebar() {
  const { sidebarCollapsed: collapsed, toggleSidebar, setNewProjectOpen } = useShell();
  const projects = useProjects();

  return (
    <aside
      data-testid={tid.sidebar}
      data-collapsed={collapsed}
      aria-label="Sidebar"
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 items-center', collapsed ? 'justify-center' : 'px-4')}>
        {collapsed ? <Logo size={26} /> : <BrandLockup />}
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        <NavItem
          to="/app/dashboard"
          icon={<LayoutDashboard className="size-4.5 shrink-0" aria-hidden />}
          label="Dashboard"
          collapsed={collapsed}
          testId={tid.navLink('dashboard')}
        />
        <NavItem
          to="/app/my-tasks"
          icon={<ListChecks className="size-4.5 shrink-0" aria-hidden />}
          label="My tasks"
          collapsed={collapsed}
          testId={tid.navLink('my-tasks')}
        />

        <div
          className={cn(
            'mt-4 flex items-center',
            collapsed ? 'justify-center' : 'justify-between px-2.5',
          )}
        >
          {!collapsed && (
            <h2 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Projects</h2>
          )}
          <Tooltip label="New project">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New project"
              onClick={() => setNewProjectOpen(true)}
              data-testid={tid.newProjectButton}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </Tooltip>
        </div>

        <div className="mt-1 flex flex-col gap-0.5">
          {projects.isLoading &&
            [0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                data-testid={tid.skeleton('sidebar-project')}
                className="mx-1 h-8"
              />
            ))}
          {projects.data?.map((p) => (
            <NavLink
              key={p.id}
              to={`/app/projects/${p.id}/board`}
              data-testid={tid.projectLink(p.id)}
              aria-label={collapsed ? p.name : undefined}
              title={p.name}
              className={linkClass(collapsed)}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {!collapsed && <span className="truncate">{p.name}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-1 border-t border-border p-2">
        <NavItem
          to="/app/settings"
          icon={<Settings className="size-4.5 shrink-0" aria-hidden />}
          label="Settings"
          collapsed={collapsed}
          testId={tid.navLink('settings')}
        />
        <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            data-testid={tid.sidebarToggle}
            className={cn('justify-start text-fg-muted', collapsed && 'justify-center px-0')}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4.5" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4.5" aria-hidden />
            )}
            {!collapsed && 'Collapse'}
          </Button>
        </Tooltip>
      </div>
    </aside>
  );
}
