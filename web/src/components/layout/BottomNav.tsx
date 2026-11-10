import { FolderKanban, LayoutDashboard, ListChecks, Plus, Search, Settings } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useProjects } from '@/api/queries/projects';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/common/states';
import { useShell } from '@/hooks/useShell';
import { cn } from '@/lib/cn';
import { tid } from '@/lib/testids';

const item =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-fg-muted';

function ProjectsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const projects = useProjects();
  const navigate = useNavigate();
  const { setNewProjectOpen } = useShell();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Projects</DialogTitle>
          <DialogDescription>Jump to a project board.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {projects.data?.length === 0 && (
            <EmptyState name="bottom-nav-projects" art="projects" title="No projects yet" />
          )}
          {projects.data?.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid={tid.projectLink(p.id)}
              onClick={() => {
                onOpenChange(false);
                navigate(`/app/projects/${p.id}/board`);
              }}
              className="flex h-12 items-center gap-3 rounded-md px-3 text-left text-base font-medium hover:bg-surface-2"
            >
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            onOpenChange(false);
            setNewProjectOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden /> New project
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Phone navigation. Replaces the sidebar below 768px. */
export function BottomNav() {
  const { setPaletteOpen } = useShell();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const active = ({ isActive }: { isActive: boolean }) => cn(item, isActive && 'text-accent-fg');

  return (
    <>
      <nav
        aria-label="Primary"
        data-testid={tid.bottomNav}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <NavLink to="/app/dashboard" className={active} data-testid={tid.navLink('dashboard')}>
          <LayoutDashboard className="size-5" aria-hidden />
          Dashboard
        </NavLink>
        <NavLink to="/app/my-tasks" className={active} data-testid={tid.navLink('my-tasks')}>
          <ListChecks className="size-5" aria-hidden />
          My tasks
        </NavLink>
        <button
          type="button"
          className={item}
          onClick={() => setProjectsOpen(true)}
          data-testid={tid.navLink('projects')}
        >
          <FolderKanban className="size-5" aria-hidden />
          Projects
        </button>
        <button
          type="button"
          className={item}
          onClick={() => setPaletteOpen(true)}
          data-testid={tid.navLink('search')}
        >
          <Search className="size-5" aria-hidden />
          Search
        </button>
        <NavLink to="/app/settings" className={active} data-testid={tid.navLink('settings')}>
          <Settings className="size-5" aria-hidden />
          Settings
        </NavLink>
      </nav>
      <ProjectsSheet open={projectsOpen} onOpenChange={setProjectsOpen} />
    </>
  );
}
