import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from 'react';
import type { Status, TaskListItem } from '@/api/client';
import { STATUSES, STATUS_META, StatusIcon } from '@/components/tasks/badges';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import { cn } from '@/lib/cn';
import { positionBetween, POSITION_STEP } from '@/lib/position';
import { tid } from '@/lib/testids';

type Columns = Record<Status, string[]>;
const COLUMN_PREFIX = 'column:';
const columnId = (s: Status) => `${COLUMN_PREFIX}${s}`;
const isColumnId = (id: string) => id.startsWith(COLUMN_PREFIX);

function group(tasks: TaskListItem[]): Columns {
  const cols: Columns = { todo: [], in_progress: [], done: [] };
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) cols[t.status].push(t.id);
  return cols;
}

export interface BoardProps {
  tasks: TaskListItem[];
  onOpen: (id: string) => void;
  onMove: (move: { id: string; status: Status; position: number }) => Promise<unknown> | void;
  onAdd: (status: Status) => void;
}

function SortableTaskCard({
  task,
  onOpen,
  onMoveTo,
  canOpen,
}: {
  task: TaskListItem;
  onOpen: (id: string) => void;
  onMoveTo: (status: Status) => void;
  canOpen: () => boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    attributes: { role: 'group' },
  });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Space starts a keyboard drag (dnd-kit); Enter opens the task.
    listeners?.onKeyDown?.(e);
    if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(task.id);
  };

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={() => canOpen() && onOpen(task.id)}
      aria-label={`${task.key} ${task.title}`}
      className="cursor-grab active:cursor-grabbing focus-visible:outline-2"
      menu={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Move ${task.key}`}
              data-testid={tid.taskCardMove(task.id)}
              // Keep the card's drag listeners from hijacking menu interaction.
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="-m-1 rounded p-1 text-fg-subtle opacity-100 transition-opacity hover:bg-surface-2 hover:text-fg focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            {STATUSES.filter((s) => s !== task.status).map((s) => (
              <DropdownMenuItem
                key={s}
                onSelect={() => onMoveTo(s)}
                data-testid={tid.taskCardMoveTo(task.id, s)}
              >
                <StatusIcon status={s} /> Move to {STATUS_META[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}

function BoardColumn({
  status,
  ids,
  byId,
  onOpen,
  onMoveTo,
  onAdd,
  canOpen,
}: {
  status: Status;
  ids: string[];
  byId: Map<string, TaskListItem>;
  onOpen: (id: string) => void;
  onMoveTo: (id: string, status: Status) => void;
  onAdd: (status: Status) => void;
  canOpen: () => boolean;
}) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: columnId(status) });
  const headingId = `col-${status}`;

  return (
    <section
      aria-labelledby={headingId}
      data-testid={tid.boardColumn(status)}
      data-count={ids.length}
      className={cn(
        'flex min-h-0 w-[86%] shrink-0 snap-center flex-col rounded-lg bg-surface-2 p-2 transition-colors sm:w-[calc(50%-0.5rem)] md:w-0 md:flex-1',
        isOver && 'bg-accent-soft ring-2 ring-accent/40',
      )}
    >
      <header className="flex items-center gap-2 px-2 pb-2 pt-1">
        <StatusIcon status={status} />
        <h2 id={headingId} className="text-base font-semibold">
          {meta.label}
        </h2>
        <span className="tabular rounded-full bg-surface px-2 text-xs font-medium text-fg-muted">
          {ids.length}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label={`Add task to ${meta.label}`}
          onClick={() => onAdd(status)}
          data-testid={tid.boardAdd(status)}
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-0.5 pb-1"
        >
          {ids.map((id) => {
            const task = byId.get(id);
            return task ? (
              <SortableTaskCard
                key={id}
                task={task}
                onOpen={onOpen}
                onMoveTo={(s) => onMoveTo(id, s)}
                canOpen={canOpen}
              />
            ) : null;
          })}
          {ids.length === 0 && (
            <p className="rounded-md border border-dashed border-border-strong px-3 py-6 text-center text-sm text-fg-subtle">
              {status === 'done' ? 'Finished tasks land here' : 'No tasks here'}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function Board({ tasks, onOpen, onMove, onAdd }: BoardProps) {
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const derived = useMemo(() => group(tasks), [tasks]);
  const [local, setLocal] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const justDragged = useRef(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Phones show one column at a time; the dots below track and control which one is in view.
  const [activeCol, setActiveCol] = useState(0);
  const onScrollColumns = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const columns = Array.from(el.querySelectorAll<HTMLElement>('section'));
    const left = el.scrollLeft;
    let best = 0;
    columns.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - el.offsetLeft - 16 - left);
      const current = columns[best];
      if (!current || d < Math.abs(current.offsetLeft - el.offsetLeft - 16 - left)) best = i;
    });
    setActiveCol(best);
  };
  const showColumn = (i: number) => {
    const el = scrollerRef.current;
    const target = el?.querySelectorAll<HTMLElement>('section')[i];
    if (el && target)
      el.scrollTo({ left: target.offsetLeft - el.offsetLeft - 16, behavior: 'smooth' });
  };
  const cols = local ?? derived;
  const colsRef = useRef(cols);
  colsRef.current = cols;

  // Left/Right jump to the neighbouring column; Up/Down use the default sortable behaviour.
  // (The default getter alone picks targets inside the same column when moving sideways.)
  const boardKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    const step = event.code === 'ArrowRight' ? 1 : event.code === 'ArrowLeft' ? -1 : 0;
    if (!step) return sortableKeyboardCoordinates(event, args);
    const { active, droppableRects } = args.context;
    if (!active) return undefined;
    event.preventDefault();
    const current = findContainer(String(active.id), colsRef.current);
    const target = current ? STATUSES[STATUSES.indexOf(current) + step] : undefined;
    const rect = target ? droppableRects.get(columnId(target)) : undefined;
    if (!rect) return args.currentCoordinates;
    return { x: rect.left + 2, y: rect.top + 2 };
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Tab'] },
      coordinateGetter: boardKeyboardCoordinates,
    }),
  );

  const findContainer = (id: string, from: Columns = cols): Status | undefined =>
    isColumnId(id)
      ? (id.slice(COLUMN_PREFIX.length) as Status)
      : STATUSES.find((s) => from[s].includes(id));

  const title = (id: string | number) => byId.get(String(id))?.title ?? 'task';
  const colName = (id: string | number | undefined) => {
    const s = id === undefined ? undefined : findContainer(String(id));
    return s ? STATUS_META[s].label : 'the board';
  };

  const handleStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setLocal(derived);
  };

  const handleOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    setLocal((prev) => {
      const current = prev ?? derived;
      const from = findContainer(activeKey, current);
      const to = findContainer(overKey, current);
      if (!from || !to || from === to) return current;
      const target = [...current[to]];
      const overIndex = isColumnId(overKey) ? target.length : target.indexOf(overKey);
      const activeRect = active.rect.current.translated;
      const below =
        !!activeRect && !!over.rect && activeRect.top > over.rect.top + over.rect.height / 2;
      const at =
        overIndex < 0 ? target.length : overIndex + (below && !isColumnId(overKey) ? 1 : 0);
      target.splice(at, 0, activeKey);
      return { ...current, [from]: current[from].filter((i) => i !== activeKey), [to]: target };
    });
  };

  const handleEnd = async ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    let final = local ?? derived;
    setActiveId(null);
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 150);

    if (over) {
      const from = findContainer(id, final);
      const to = findContainer(String(over.id), final);
      if (from && to && from === to) {
        const oldIndex = final[from].indexOf(id);
        const newIndex = isColumnId(String(over.id))
          ? final[from].length - 1
          : final[from].indexOf(String(over.id));
        if (newIndex >= 0 && oldIndex !== newIndex) {
          final = { ...final, [from]: arrayMove(final[from], oldIndex, newIndex) };
          setLocal(final);
        }
      }
    }

    const status = findContainer(id, final);
    if (!status) return setLocal(null);
    const list = final[status];
    const index = list.indexOf(id);
    const unchanged = byId.get(id)?.status === status && derived[status].indexOf(id) === index;
    if (unchanged) return setLocal(null);

    const pos = (i: number) =>
      i < 0 || i >= list.length ? null : (byId.get(list[i] as string)?.position ?? null);
    const position = positionBetween(pos(index - 1), pos(index + 1));
    try {
      await onMove({ id, status, position });
    } finally {
      setLocal(null);
    }
  };

  const moveTo = (id: string, status: Status) => {
    const last = Math.max(0, ...derived[status].map((i) => byId.get(i)?.position ?? 0));
    void onMove({ id, status, position: last + POSITION_STEP });
  };

  const activeTask = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleStart}
      onDragOver={handleOver}
      onDragEnd={handleEnd}
      onDragCancel={() => {
        setActiveId(null);
        setLocal(null);
      }}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${title(active.id)} is over ${colName(over.id)}.`
              : `${title(active.id)} is not over a column.`,
          onDragEnd: ({ active, over }) =>
            over
              ? `Dropped ${title(active.id)} in ${colName(over.id)}.`
              : `${title(active.id)} was returned.`,
          onDragCancel: ({ active }) => `Cancelled. ${title(active.id)} was returned.`,
        },
        screenReaderInstructions: {
          draggable:
            'To pick up a task, press Space. Use the arrow keys to move it, Space to drop it, and Escape to cancel. Press Enter to open the task.',
        },
      }}
    >
      <div className="flex h-full flex-col">
        <div
          ref={scrollerRef}
          onScroll={onScrollColumns}
          data-testid={tid.boardView}
          className="scrollbar-none flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-1 md:px-6 md:pb-4"
        >
          {STATUSES.map((s) => (
            <BoardColumn
              key={s}
              status={s}
              ids={cols[s]}
              byId={byId}
              onOpen={onOpen}
              onMoveTo={moveTo}
              onAdd={onAdd}
              canOpen={() => !justDragged.current}
            />
          ))}
        </div>
        <div
          className="flex items-center justify-center gap-2 pb-3 md:hidden"
          data-testid={tid.boardColumnDots}
        >
          <span className="sr-only" aria-live="polite">
            Column {activeCol + 1} of {STATUSES.length}:{' '}
            {STATUS_META[STATUSES[activeCol] ?? 'todo'].label}
          </span>
          {STATUSES.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-label={`Show ${STATUS_META[s].label}`}
              aria-current={i === activeCol}
              onClick={() => showColumn(i)}
              className="flex size-6 items-center justify-center"
            >
              <span
                aria-hidden
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === activeCol ? 'w-5 bg-accent' : 'w-2 bg-border-strong',
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeTask ? <TaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
