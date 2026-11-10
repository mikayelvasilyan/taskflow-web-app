import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Member, Priority, Status } from '@/api/client';
import { PRIORITY_META, STATUS_META } from '@/components/tasks/badges';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/menu';
import { Checkbox } from '@/components/ui/misc';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { cn } from '@/lib/cn';
import { tid } from '@/lib/testids';

const ALL = 'all';

function FilterControls({ members, stacked }: { members: Member[]; stacked?: boolean }) {
  const { filters, update, clear, activeCount } = useTaskFilters();

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
  const selectClass = stacked ? 'w-full' : 'w-auto min-w-36';

  return (
    <>
      <Select
        aria-label="Filter by status"
        value={filters.status ?? ALL}
        onValueChange={(v) => update({ status: v === ALL ? undefined : v })}
        options={statusOptions}
        data-testid={tid.filterStatus}
        className={selectClass}
      />
      <Select
        aria-label="Filter by priority"
        value={filters.priority ?? ALL}
        onValueChange={(v) => update({ priority: v === ALL ? undefined : v })}
        options={priorityOptions}
        data-testid={tid.filterPriority}
        className={selectClass}
      />
      <Select
        aria-label="Filter by assignee"
        value={filters.assignee ?? ALL}
        onValueChange={(v) => update({ assignee: v === ALL ? undefined : v })}
        options={assigneeOptions}
        data-testid={tid.filterAssignee}
        className={selectClass}
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
      {!stacked && activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clear} data-testid={tid.filterClear}>
          <X className="size-4" aria-hidden /> Clear
        </Button>
      )}
    </>
  );
}

/**
 * Search, status, priority, assignee and overdue filters, kept in the URL query string.
 * Phones get a search row plus a "Filters" button that opens a bottom sheet.
 */
export function FilterBar({ members }: { members: Member[] }) {
  const { filters, update, clear, activeCount } = useTaskFilters();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [q, setQ] = useState(filters.q ?? '');

  // Keep the box in sync when the URL changes (Clear, Back button).
  useEffect(() => setQ(filters.q ?? ''), [filters.q]);

  // Debounce typing into the URL.
  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const t = setTimeout(() => update({ q: q.trim() || undefined }), 250);
    return () => clearTimeout(t);
  }, [q, filters.q, update]);

  // On phones the search box is outside the sheet, so it does not count towards the badge.
  const sheetCount = activeCount - (filters.q ? 1 : 0);

  return (
    <div role="search" aria-label="Filter tasks" className="flex flex-wrap items-center gap-2">
      <div className={cn('relative min-w-48 flex-1 sm:max-w-xs', isPhone && 'min-w-0')}>
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

      {isPhone ? (
        <>
          <Button
            onClick={() => setSheetOpen(true)}
            aria-label={sheetCount > 0 ? `Filters, ${sheetCount} active` : 'Filters'}
            data-testid={tid.filtersToggle}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {sheetCount > 0 && (
              <span className="tabular rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent">
                {sheetCount}
              </span>
            )}
          </Button>
          <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription>Narrow down the tasks in this project.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <FilterControls members={members} stacked />
              </div>
              <DialogFooter>
                {activeCount > 0 && (
                  <Button onClick={clear} data-testid={tid.filterClear}>
                    Clear all
                  </Button>
                )}
                <Button variant="primary" onClick={() => setSheetOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <FilterControls members={members} />
      )}
    </div>
  );
}
