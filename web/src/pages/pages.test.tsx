import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '@/App';
import { server } from '@/test/msw/server';
import { adminUser, mockSession, renderWithProviders } from '@/test/utils';

const emptyDashboard = {
  counts: { todo: 0, in_progress: 0, done: 0, overdue: 0 },
  byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
  completedByDay: [],
  insights: { projectCount: 0, dueThisWeek: 0, completedLast7Days: 0, oldestOverdueDays: null },
  overdue: [],
  myTasks: [],
};

const noProjects = () => http.get('/api/projects', () => HttpResponse.json({ projects: [] }));

describe('signup', () => {
  it('shows inline validation for every field', async () => {
    mockSession(null);
    renderWithProviders(<AppRoutes />, { route: '/signup' });
    await userEvent.click(await screen.findByTestId('signup-submit'));
    expect(await screen.findByTestId('signup-name-error')).toHaveTextContent('Name is required');
    expect(screen.getByTestId('signup-email-error')).toHaveTextContent('Email is required');
    expect(screen.getByTestId('signup-password-error')).toHaveTextContent('at least 8 characters');

    await userEvent.type(screen.getByTestId('signup-password-input'), 'longenough');
    await userEvent.click(screen.getByTestId('signup-submit'));
    expect(await screen.findByTestId('signup-password-error')).toHaveTextContent(
      'must contain a digit',
    );
  });

  it('shows the server message when the email is already registered', async () => {
    mockSession(null);
    server.use(
      http.post('/api/auth/signup', () =>
        HttpResponse.json(
          { error: { code: 'CONFLICT', message: 'An account with this email already exists' } },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<AppRoutes />, { route: '/signup' });
    await userEvent.type(await screen.findByTestId('signup-name-input'), 'Ada');
    await userEvent.type(screen.getByTestId('signup-email-input'), 'ada@example.com');
    await userEvent.type(screen.getByTestId('signup-password-input'), 'Passw0rd!');
    await userEvent.click(screen.getByTestId('signup-submit'));
    expect(await screen.findByTestId('signup-error')).toHaveTextContent('already exists');
  });
});

describe('theme', () => {
  it('applies the chosen theme to the document and remembers it', async () => {
    mockSession(adminUser);
    server.use(noProjects());
    renderWithProviders(<AppRoutes />, { route: '/app/settings?tab=appearance' });

    await userEvent.click(await screen.findByTestId('theme-option-dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('tf-theme')).toBe('dark');
    expect(screen.getByTestId('theme-option-dark')).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByTestId('theme-option-light'));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('tf-theme')).toBe('light');
  });

  it('toggles from the top bar', async () => {
    mockSession(adminUser);
    server.use(noProjects());
    renderWithProviders(<AppRoutes />, { route: '/app/settings?tab=appearance' });
    const before = document.documentElement.dataset.theme;
    await userEvent.click(await screen.findByTestId('theme-toggle'));
    expect(document.documentElement.dataset.theme).not.toBe(before);
  });
});

describe('loading, error and empty states', () => {
  it('shows an error state with a working retry on the dashboard', async () => {
    mockSession(adminUser);
    let fail = true;
    server.use(
      noProjects(),
      http.get('/api/dashboard', () =>
        fail
          ? HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 })
          : HttpResponse.json(emptyDashboard),
      ),
    );
    renderWithProviders(<AppRoutes />, { route: '/app/dashboard' });
    expect(await screen.findByTestId('error-state-dashboard')).toBeInTheDocument();

    fail = false;
    await userEvent.click(screen.getByTestId('retry-dashboard'));
    expect(await screen.findByTestId('stat-card-todo')).toHaveAttribute('data-value', '0');
    // With no tasks the dashboard explains itself instead of drawing empty charts.
    expect(screen.getByTestId('empty-state-dashboard-chart')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-overdue')).toBeInTheDocument();
  });

  it('shows a skeleton while loading and an empty state on My tasks', async () => {
    mockSession(adminUser);
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      noProjects(),
      http.get('/api/tasks', async () => {
        await gate;
        return HttpResponse.json({ tasks: [] });
      }),
    );
    renderWithProviders(<AppRoutes />, { route: '/app/my-tasks' });
    expect(await screen.findByTestId('skeleton-my-tasks')).toBeInTheDocument();
    release();
    expect(await screen.findByTestId('empty-state-my-tasks')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('skeleton-my-tasks')).not.toBeInTheDocument());
  });
});
