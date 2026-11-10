import { Plus } from 'lucide-react';
import { NavLink, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { isApiError, type ProjectDetail } from '@/api/client';
import { useProject } from '@/api/queries/projects';
import { AvatarStack } from '@/components/common/Avatar';
import { ErrorState } from '@/components/common/states';
import { PageHeader } from '@/components/layout/PageHeader';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { TaskPanel } from '@/components/tasks/TaskPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { useShell } from '@/hooks/useShell';
import { cn } from '@/lib/cn';
import { tid } from '@/lib/testids';
import NotFound from './NotFound';

export interface ProjectContext {
  project: ProjectDetail;
}

export const useProjectContext = () => useOutletContext<ProjectContext>();

const tab = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex h-7 items-center rounded-md px-3 text-sm font-medium transition-colors',
    isActive ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg',
  );

export default function ProjectLayout() {
  const { projectId = '' } = useParams();
  const query = useProject(projectId);
  const onSettingsTab = useLocation().pathname.endsWith('/settings');
  const { newTaskOpen, newTaskStatus, setNewTaskOpen, openNewTask } = useShell();

  if (query.isLoading) {
    return (
      <div data-testid={tid.skeleton('project')} className="flex flex-col gap-4 px-4 pt-6 md:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError) {
    const err = query.error;
    if (isApiError(err) && err.status === 404) return <NotFound inShell />;
    if (isApiError(err) && err.status === 403) {
      return (
        <ErrorState
          name="project-forbidden"
          message="You are not a member of this project, so you cannot open it."
        />
      );
    }
    return <ErrorState name="project" onRetry={() => query.refetch()} />;
  }

  const project = query.data;
  if (!project) return null;

  return (
    <div data-testid={tid.projectPage} className="flex h-full flex-col">
      <div className="flex flex-col gap-4 px-4 pb-3 pt-5 md:px-6 md:pt-6">
        <PageHeader
          titleTestId={tid.projectTitle}
          title={project.name}
          leading={
            <span
              aria-hidden
              className="size-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          }
          description={
            <span className="flex items-center gap-2">
              <span className="tabular text-fg-subtle">{project.key}</span>
              <AvatarStack people={project.members} />
            </span>
          }
          actions={
            onSettingsTab ? undefined : (
              <Button
                variant="primary"
                onClick={() => openNewTask('todo')}
                data-testid={tid.newTaskButton}
              >
                <Plus className="size-4" aria-hidden />
                <span className="max-sm:sr-only">New task</span>
              </Button>
            )
          }
        />
        <nav
          aria-label="Project views"
          className="inline-flex w-fit items-center gap-1 rounded-lg bg-surface-2 p-1"
        >
          <NavLink to="board" className={tab} data-testid={tid.tabBoard}>
            Board
          </NavLink>
          <NavLink to="list" className={tab} data-testid={tid.tabList}>
            List
          </NavLink>
          <NavLink to="settings" className={tab} data-testid={tid.tabSettings}>
            Settings
          </NavLink>
        </nav>
      </div>

      <div className="min-h-0 flex-1">
        <Outlet context={{ project } satisfies ProjectContext} />
      </div>

      <NewTaskDialog
        projectId={project.id}
        members={project.members}
        open={newTaskOpen}
        status={newTaskStatus}
        onOpenChange={setNewTaskOpen}
      />
      <TaskPanel project={project} />
    </div>
  );
}
