import { AlertTriangle, CheckCircle2, Circle, CircleDashed, type LucideIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboard } from '@/api/queries/misc';
import { EmptyState, ErrorState } from '@/components/common/states';
import { Page, PageHeader } from '@/components/layout/PageHeader';
import { TaskRowLink } from '@/components/tasks/TaskRowLink';
import { Skeleton } from '@/components/ui/misc';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/dates';
import { tid } from '@/lib/testids';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

function StatCard({
  name,
  label,
  value,
  icon: Icon,
  tone,
  hint,
  hintClass = 'text-fg-muted',
}: {
  name: string;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  hint: string;
  hintClass?: string;
}) {
  return (
    <div
      data-testid={tid.statCard(name)}
      data-value={value}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        <Icon className={cn('size-4.5', tone)} aria-hidden />
      </div>
      <span className="tabular text-4xl font-semibold tracking-tight">{value}</span>
      <span className={cn('text-xs', hintClass)}>{hint}</span>
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs',
        className,
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const SLICES = [
  { key: 'todo', label: 'To do', color: 'var(--fg-subtle)' },
  { key: 'in_progress', label: 'In progress', color: 'var(--accent)' },
  { key: 'done', label: 'Done', color: 'var(--success)' },
] as const;

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--fg)',
  fontSize: 12,
  boxShadow: 'var(--shadow-md)',
};

export default function Dashboard() {
  const { user } = useAuth();
  const q = useDashboard();
  const firstName = user?.name.split(' ')[0] ?? '';

  if (q.isError) return <ErrorState name="dashboard" onRetry={() => q.refetch()} />;

  const d = q.data;
  const total = d ? d.counts.todo + d.counts.in_progress + d.counts.done : 0;

  return (
    <Page>
      <div data-testid={tid.dashboardPage} className="flex flex-col gap-6">
        <PageHeader
          title={`${greeting()}, ${firstName}`}
          description={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        />

        {q.isLoading || !d ? (
          <div data-testid={tid.skeleton('dashboard')} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                name="todo"
                label="To do"
                value={d.counts.todo}
                icon={Circle}
                tone="text-fg-muted"
                hint={`across ${d.insights.projectCount} ${d.insights.projectCount === 1 ? 'project' : 'projects'}`}
              />
              <StatCard
                name="in_progress"
                label="In progress"
                value={d.counts.in_progress}
                icon={CircleDashed}
                tone="text-accent-fg"
                hint={`${d.insights.dueThisWeek} due this week`}
              />
              <StatCard
                name="done"
                label="Done"
                value={d.counts.done}
                icon={CheckCircle2}
                tone="text-success"
                hint={`${d.insights.completedLast7Days} in the last 7 days`}
              />
              <StatCard
                name="overdue"
                label="Overdue"
                value={d.counts.overdue}
                icon={AlertTriangle}
                tone="text-danger"
                hint={
                  d.insights.oldestOverdueDays === null
                    ? 'nothing overdue'
                    : `oldest: ${d.insights.oldestOverdueDays} ${d.insights.oldestOverdueDays === 1 ? 'day' : 'days'}`
                }
                hintClass={d.insights.oldestOverdueDays === null ? 'text-success' : 'text-danger'}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <Card title="Tasks by status" className="lg:col-span-2">
                {total === 0 ? (
                  <EmptyState
                    name="dashboard-chart"
                    art="tasks"
                    title="No tasks yet"
                    description="Charts appear once your projects have tasks."
                  />
                ) : (
                  <>
                    <div
                      className="relative h-56"
                      role="img"
                      aria-label={`Tasks by status: ${SLICES.map((s) => `${d.counts[s.key]} ${s.label}`).join(', ')}`}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={SLICES.map((s) => ({ name: s.label, value: d.counts[s.key] }))}
                            dataKey="value"
                            innerRadius="62%"
                            outerRadius="88%"
                            paddingAngle={2}
                            stroke="var(--surface)"
                            strokeWidth={2}
                          >
                            {SLICES.map((s) => (
                              <Cell key={s.key} fill={s.color} />
                            ))}
                          </Pie>
                          <ChartTooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="tabular text-3xl font-semibold">{total}</span>
                        <span className="text-xs text-fg-muted">tasks</span>
                      </div>
                    </div>
                    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-fg-muted">
                      {SLICES.map((s) => (
                        <li key={s.key} className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="size-2.5 rounded-full"
                            style={{ background: s.color }}
                          />
                          {s.label}{' '}
                          <span className="tabular font-medium text-fg">{d.counts[s.key]}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>

              <Card title="Completed, last 14 days" className="lg:col-span-3">
                <div
                  className="h-56"
                  role="img"
                  aria-label={`Tasks completed per day over the last 14 days: ${d.completedByDay.reduce((n, x) => n + x.count, 0)} in total`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={d.completedByDay.map((x) => ({
                        ...x,
                        label: formatShortDate(x.date),
                      }))}
                      margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'var(--fg-muted)', fontSize: 11 }}
                        interval={2}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, (max: number) => Math.max(2, max + 1)]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'var(--fg-muted)', fontSize: 11 }}
                      />
                      <ChartTooltip
                        cursor={{ fill: 'var(--surface-2)' }}
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: 'var(--fg)', fontWeight: 600 }}
                        formatter={(v) => [`${v} completed`, '']}
                        separator=""
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--accent)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Overdue">
                <div data-testid={tid.overdueList}>
                  {d.overdue.length === 0 ? (
                    <EmptyState
                      name="overdue"
                      art="done"
                      title="Nothing overdue"
                      description="You are all caught up."
                      className="py-8"
                    />
                  ) : (
                    <ul className="-mx-3 flex flex-col">
                      {d.overdue.map((t) => (
                        <li key={t.id}>
                          <TaskRowLink task={t} showAssignee />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
              <Card title="My tasks">
                <div data-testid={tid.myTasksList}>
                  {d.myTasks.length === 0 ? (
                    <EmptyState
                      name="my-tasks-card"
                      art="tasks"
                      title="No open tasks assigned to you"
                      description="Tasks assigned to you will show up here."
                      className="py-8"
                    />
                  ) : (
                    <ul className="-mx-3 flex flex-col">
                      {d.myTasks.map((t) => (
                        <li key={t.id}>
                          <TaskRowLink task={t} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
