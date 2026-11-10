import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Member, Priority, Status } from '@/api/client';
import { PRIORITY_META, STATUS_META } from '@/components/tasks/badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/menu';
import { Checkbox } from '@/components/ui/misc';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { tid } from '@/lib/testids';

const ALL = 'all';

/** Search, status, priority, assignee and overdue filters, kept in the URL query string. */
export function FilterBar({ members }: { members: Member[] }) {
  const { filters, update, clear, activeCount } = useTaskFilters();
  const [q, setQ] = useState(filters.q ?? '');

  // Keep the box in sync when the URL changes (Clear, Back button).
  useEffect(() => setQ(filters.q ?? ''), [filters.q]);

  // Debounce typing into the URL.
  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const t = setTimeout(() => update({ q: q.trim() || undefined }), 250);
    return () => clearTimeout(t);
  }, [q, filters.q, update]);

  const statusOptions = [
    { value: ALL, label: 'All statuses' },
    ...(Object.keys(STATUS_META) as Status[]).map((s) => ({
      value: s,
      label: STATUS_META[s].label,
    })),
  ];
  const priorityOptions = [
    { value: ALL, label: 'All priorities' },
    ...(Object.keys(PRIORITY_META) as Priority[]).map((p) => ({
      value: p,
      label: PRIORITY_META[p].label,
    })),
  ];
  const assigneeOptions = [
    { value: ALL, label: 'Anyone' },
    { value: 'me', label: 'Assigned to me' },
    { value: 'none', label: 'Unassigned' },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ];

  return (
    <div role="search" aria-label="Filter tasks" className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1 sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search tasks"
          placeholder="Search tasks"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid={tid.filterSearch}
          className="pl-8"
        />
      </div>
      <Select
        aria-label="Filter by status"
        value={filters.status ?? ALL}
        onValueChange={(v) => update({ status: v === ALL ? undefined : v })}
        options={statusOptions}
        data-testid={tid.filterStatus}
        className="w-auto min-w-36"
      />
      <Select
        aria-label="Filter by priority"
        value={filters.priority ?? ALL}
        onValueChange={(v) => update({ priority: v === ALL ? undefined : v })}
        options={priorityOptions}
        data-testid={tid.filterPriority}
        className="w-auto min-w-36"
      />
      <Select
        aria-label="Filter by assignee"
        value={filters.assignee ?? ALL}
        onValueChange={(v) => update({ assignee: v === ALL ? undefined : v })}
        options={assigneeOptions}
        data-testid={tid.filterAssignee}
        className="w-auto min-w-36"
      />
      <label
        htmlFor="filter-overdue"
        className="flex h-9 items-center gap-2 rounded-md px-1 text-base text-fg-muted max-md:h-10"
      >
        <Checkbox
          id="filter-overdue"
          checked={!!filters.overdue}
          onCheckedChange={(c) => update({ overdue: c === true })}
          data-testid={tid.filterOverdue}
        />
        Overdue only
      </label>
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clear} data-testid={tid.filterClear}>
          <X className="size-4" aria-hidden /> Clear
        </Button>
      )}
    </div>
  );
}
