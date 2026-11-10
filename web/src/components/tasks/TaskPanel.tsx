import { CalendarDays, MoreHorizontal, Tag, Trash2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  isApiError,
  type Priority,
  type ProjectDetail,
  type Status,
  type TaskDetail,
} from '@/api/client';
import {
  useAddComment,
  useDeleteComment,
  useDeleteTask,
  useTask,
  useUpdateTask,
  type TaskInput,
} from '@/api/queries/tasks';
import { Avatar } from '@/components/common/Avatar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/states';
import { notify } from '@/components/common/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
} from '@/components/ui/menu';
import { Checkbox, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc';
import { useAuth } from '@/hooks/useAuth';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { cn } from '@/lib/cn';
import { formatShortDate, relativeDue, timeAgo } from '@/lib/dates';
import { tid } from '@/lib/testids';
import {
  LabelChip,
  PRIORITIES,
  PRIORITY_META,
  PriorityIcon,
  STATUSES,
  STATUS_META,
  StatusIcon,
} from './badges';

const NONE = 'none';

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2 min-h-8">
      <span className="text-sm text-fg-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function describe(a: TaskDetail['activity'][number]): string {
  const d = (a.data ?? {}) as Record<string, string | null>;
  const status = (s: string | null) => (s ? (STATUS_META[s as Status]?.label ?? s) : 'none');
  switch (a.type) {
    case 'created':
      return 'created this task';
    case 'status_changed':
      return `moved it from ${status(d.from ?? null)} to ${status(d.to ?? null)}`;
    case 'priority_changed':
      return `changed priority from ${d.from} to ${d.to}`;
    case 'assigned':
      return d.to ? `assigned it to ${d.to}` : 'removed the assignee';
    case 'due_changed':
      return d.to ? `set the due date to ${formatShortDate(d.to)}` : 'removed the due date';
    case 'renamed':
      return 'renamed the task';
    case 'commented':
      return 'added a comment';
  }
}

function DueDateField({
  task,
  onChange,
}: {
  task: TaskDetail;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const due = task.dueDate ? relativeDue(task.dueDate, task.status) : null;
  const tone =
    due?.tone === 'overdue' ? 'text-danger' : due?.tone === 'today' ? 'text-warning' : 'text-fg';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="-mx-2 inline-flex h-8 items-center gap-2 rounded-md px-2 text-base hover:bg-surface-2"
        >
          <CalendarDays className="size-4 text-fg-muted" aria-hidden />
          <span className="sr-only">Due date: </span>
          {task.dueDate && due ? (
            <span className={cn('tabular', tone)}>
              {due.label}
              {due.tone !== 'normal' && due.tone !== 'done' && (
                <span className="text-fg-muted"> · {formatShortDate(task.dueDate)}</span>
              )}
            </span>
          ) : (
            <span className="text-fg-subtle">No date</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-56 flex-col gap-2">
        <Input
          type="date"
          aria-label="Due date"
          value={task.dueDate ?? ''}
          onChange={(e) => {
            onChange(e.target.value || null);
            if (e.target.value) setOpen(false);
          }}
          data-testid={tid.taskDue}
        />
        {task.dueDate && (
          <Button
            size="sm"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Clear date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Description({
  task,
  onSave,
}: {
  task: TaskDetail;
  onSave: (text: string) => Promise<unknown>;
}) {
  const [tab, setTab] = useState<'write' | 'preview'>(
    task.description.trim() ? 'preview' : 'write',
  );
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(task.description);
  const [saving, setSaving] = useState(false);
  useEffect(() => setText(task.description), [task.description]);
  // Grow with the content (6 to ~16 lines) so text is never cut off mid-line.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 144), 400)}px`;
  }, [text, tab]);
  const dirty = text !== task.description;

  return (
    <section aria-labelledby="desc-heading">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'write' | 'preview')}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center justify-between">
          <h3 id="desc-heading" className="text-sm font-semibold">
            Description
          </h3>
          <TabsList className="h-8">
            <TabsTrigger value="write" data-testid={tid.taskDescriptionTab('write')}>
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" data-testid={tid.taskDescriptionTab('preview')}>
              Preview
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write" className="flex flex-col gap-2">
          <Textarea
            ref={areaRef}
            aria-label="Description"
            rows={6}
            className="resize-none overflow-y-auto"
            placeholder="Add details. Markdown is supported."
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-testid={tid.taskDescription}
          />
          {dirty && (
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setText(task.description)}>
                Discard
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={saving}
                data-testid={tid.taskDescriptionSave}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onSave(text);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Save
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="preview">
          <div
            data-testid={tid.taskDescriptionPreview}
            className="markdown min-h-24 rounded-md border border-border bg-surface-2 p-3"
          >
            {text.trim() ? (
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{text}</ReactMarkdown>
            ) : (
              <p className="text-fg-subtle">Nothing to preview.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Comments({ task }: { task: TaskDetail }) {
  const { user } = useAuth();
  const add = useAddComment(task.id);
  const remove = useDeleteComment(task.id);
  const [body, setBody] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    try {
      await add.mutateAsync(body.trim());
      setBody('');
    } catch (err) {
      notify.error(isApiError(err) ? err.message : 'Could not post the comment.');
    }
  };

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-3">
      <h3 id="comments-heading" className="text-sm font-semibold">
        Comments <span className="tabular font-normal text-fg-muted">({task.comments.length})</span>
      </h3>
      <ul className="flex flex-col gap-3">
        {task.comments.map((c) => (
          <li key={c.id} data-testid={tid.comment(c.id)} className="flex gap-2.5">
            {c.author && <Avatar person={c.author} size="md" className="ring-0" />}
            <div className="min-w-0 flex-1 rounded-lg bg-surface-2 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-fg-muted">
                <span className="font-semibold text-fg">{c.author?.name}</span>
                <span>{timeAgo(c.createdAt)}</span>
                {(user?.role === 'admin' || user?.id === c.author?.id) && (
                  <button
                    type="button"
                    aria-label="Delete comment"
                    data-testid={tid.commentDelete(c.id)}
                    onClick={() =>
                      remove.mutate(c.id, {
                        onError: () => notify.error('Could not delete the comment.'),
                      })
                    }
                    className="ml-auto rounded p-1 hover:bg-surface hover:text-danger"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-base">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Textarea
          aria-label="Add a comment"
          rows={focused || body ? 3 : 1}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-h-10"
          placeholder="Write a comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          data-testid={tid.commentInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
          }}
        />
        <Button
          variant="primary"
          size="sm"
          className={cn('self-end', !focused && !body && 'hidden')}
          loading={add.isPending}
          disabled={!body.trim()}
          onClick={submit}
          data-testid={tid.commentSubmit}
        >
          Comment
        </Button>
      </div>
    </section>
  );
}

function PanelBody({
  task,
  project,
  close,
}: {
  task: TaskDetail;
  project: ProjectDetail;
  close: () => void;
}) {
  const update = useUpdateTask();
  const del = useDeleteTask();
  const [title, setTitle] = useState(task.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setTitle(task.title), [task.title]);

  const save = async (patch: TaskInput) => {
    try {
      await update.mutateAsync({ id: task.id, ...patch });
    } catch (err) {
      notify.error(isApiError(err) ? err.message : 'Could not save your change.');
      throw err;
    }
  };

  const commitTitle = () => {
    const next = title.trim();
    if (!next) {
      setTitleError('Title is required');
      setTitle(task.title);
      return;
    }
    setTitleError(null);
    if (next !== task.title) void save({ title: next }).catch(() => setTitle(task.title));
  };

  const labelIds = new Set(task.labels.map((l) => l.id));
  const toggleLabel = (id: string, on: boolean) => {
    const next = new Set(labelIds);
    if (on) next.add(id);
    else next.delete(id);
    void save({ labelIds: [...next] }).catch(() => undefined);
  };

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="tabular text-sm font-medium text-fg-subtle">{task.key}</span>
        <span className="truncate text-sm text-fg-muted">in {project.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Task actions"
                data-testid={tid.taskMenu}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                danger
                onSelect={() => setConfirmDelete(true)}
                data-testid={tid.taskDelete}
              >
                <Trash2 className="size-4" aria-hidden /> Delete task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close task"
            onClick={close}
            data-testid={tid.taskPanelClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-1">
          <Input
            aria-label="Task title"
            aria-invalid={!!titleError}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            data-testid={tid.taskTitle}
            className="h-auto border-transparent px-2 py-1.5 text-2xl font-semibold shadow-none hover:border-border focus-visible:border-ring -mx-2 w-[calc(100%+1rem)]"
          />
          {titleError && (
            <p role="alert" className="text-xs font-medium text-danger">
              {titleError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <PropertyRow label="Status">
            <Select
              variant="inline"
              aria-label="Status"
              value={task.status}
              onValueChange={(v) => void save({ status: v as Status }).catch(() => undefined)}
              data-testid={tid.taskStatus}
              options={STATUSES.map((s) => ({
                value: s,
                label: STATUS_META[s].label,
                icon: <StatusIcon status={s} />,
              }))}
            />
          </PropertyRow>
          <PropertyRow label="Priority">
            <Select
              variant="inline"
              aria-label="Priority"
              value={task.priority}
              onValueChange={(v) => void save({ priority: v as Priority }).catch(() => undefined)}
              data-testid={tid.taskPriority}
              options={[...PRIORITIES].reverse().map((p) => ({
                value: p,
                label: PRIORITY_META[p].label,
                icon: <PriorityIcon priority={p} />,
              }))}
            />
          </PropertyRow>
          <PropertyRow label="Assignee">
            <Select
              variant="inline"
              aria-label="Assignee"
              value={task.assignee?.id ?? NONE}
              onValueChange={(v) =>
                void save({ assigneeId: v === NONE ? null : v }).catch(() => undefined)
              }
              data-testid={tid.taskAssignee}
              options={[
                { value: NONE, label: 'Unassigned' },
                ...project.members.map((m) => ({
                  value: m.id,
                  label: m.name,
                  icon: <Avatar person={m} size="xs" className="ring-0" />,
                })),
              ]}
            />
          </PropertyRow>
          <PropertyRow label="Due date">
            <DueDateField
              task={task}
              onChange={(dueDate) => void save({ dueDate }).catch(() => undefined)}
            />
          </PropertyRow>
          <PropertyRow label="Labels">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid={tid.taskLabels}
                  className={cn(
                    '-mx-2 flex min-h-8 flex-wrap items-center gap-1 rounded-md px-2 py-1 text-left hover:bg-surface-2',
                  )}
                >
                  {task.labels.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-base text-fg-subtle">
                      <Tag className="size-4" aria-hidden /> Add labels
                    </span>
                  ) : (
                    task.labels.map((l) => <LabelChip key={l.id} label={l} />)
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                {project.labels.length === 0 ? (
                  <p className="text-sm text-fg-muted">This project has no labels yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {project.labels.map((l) => (
                      <li key={l.id}>
                        <label
                          htmlFor={`label-${l.id}`}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-surface-2"
                        >
                          <Checkbox
                            id={`label-${l.id}`}
                            checked={labelIds.has(l.id)}
                            onCheckedChange={(c) => toggleLabel(l.id, c === true)}
                            data-testid={tid.taskLabelToggle(l.id)}
                          />
                          <LabelChip label={l} />
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          </PropertyRow>
        </div>

        <Description task={task} onSave={(description) => save({ description })} />
        <Comments task={task} />

        <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
          <h3 id="activity-heading" className="text-sm font-semibold">
            Activity
          </h3>
          <ul data-testid={tid.activityList} className="flex flex-col gap-2.5">
            {task.activity.map((a) => (
              <li
                key={a.id}
                data-testid={tid.activityItem(a.id)}
                className="flex items-start gap-2 text-sm text-fg-muted"
              >
                {a.actor && <Avatar person={a.actor} size="xs" className="mt-0.5 ring-0" />}
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-fg">{a.actor?.name}</span> {describe(a)}
                </span>
                <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={`${task.key} and its comments will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete task"
        danger
        onConfirm={async () => {
          try {
            await del.mutateAsync(task.id);
            notify.success(`Deleted ${task.key}`);
            close();
          } catch (err) {
            notify.error(isApiError(err) ? err.message : 'Could not delete the task.');
          }
        }}
      />
    </>
  );
}

/** Right-hand side panel, opened with `?task=<id>`. Deep-linkable; Esc or Back closes it. */
export function TaskPanel({ project }: { project: ProjectDetail }) {
  const { taskId, closeTask } = useTaskFilters();
  const task = useTask(taskId);
  const open = !!taskId;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeTask()}>
      <SheetContent data-testid={tid.taskPanel} aria-describedby={undefined}>
        <DialogTitle className="sr-only">Task details</DialogTitle>
        <DialogDescription className="sr-only">Edit this task</DialogDescription>
        {task.isLoading && (
          <div data-testid={tid.skeleton('task-panel')} className="flex flex-col gap-4 p-5">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-4/5" />
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        )}
        {task.isError && (
          <ErrorState
            name="task-panel"
            message={
              isApiError(task.error) && task.error.status === 404
                ? 'This task no longer exists.'
                : 'Could not load this task.'
            }
            onRetry={() => task.refetch()}
          />
        )}
        {task.data &&
          (task.data.projectId === project.id ? (
            <PanelBody key={task.data.id} task={task.data} project={project} close={closeTask} />
          ) : (
            <ErrorState
              name="task-panel-project"
              message="This task belongs to a different project."
            />
          ))}
      </SheetContent>
    </Dialog>
  );
}
