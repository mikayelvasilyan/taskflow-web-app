import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '@/App';
import { server } from '@/test/msw/server';
import { adminUser, memberUser, mockSession, renderWithProviders } from '@/test/utils';

const err = (code: string, message: string, status: number, details: unknown[] = []) =>
  HttpResponse.json({ error: { code, message, details } }, { status });

describe('login', () => {
  it('shows inline validation messages and does not call the API', async () => {
    mockSession(null);
    renderWithProviders(<AppRoutes />, { route: '/login' });
    await userEvent.click(await screen.findByTestId('login-submit'));
    expect(await screen.findByTestId('login-email-error')).toHaveTextContent('Email is required');
    expect(screen.getByTestId('login-password-error')).toHaveTextContent('Password is required');

    await userEvent.type(screen.getByTestId('login-email-input'), 'not-an-email');
    await userEvent.click(screen.getByTestId('login-submit'));
    expect(await screen.findByTestId('login-email-error')).toHaveTextContent('Enter a valid email');
  });

  it('shows the server error for wrong credentials', async () => {
    mockSession(null);
    server.use(
      http.post('/api/auth/login', () => err('UNAUTHENTICATED', 'Invalid email or password', 401)),
    );
    renderWithProviders(<AppRoutes />, { route: '/login' });
    await userEvent.type(await screen.findByTestId('login-email-input'), 'a@b.dev');
    await userEvent.type(screen.getByTestId('login-password-input'), 'Wrong123!');
    await userEvent.click(screen.getByTestId('login-submit'));
    expect(await screen.findByTestId('login-error')).toHaveTextContent('Invalid email or password');
  });

  it('logs in with the demo button and lands on the dashboard', async () => {
    mockSession(null);
    server.use(
      http.post('/api/auth/login', () => HttpResponse.json({ user: adminUser, token: 't' })),
      http.get('/api/projects', () => HttpResponse.json({ projects: [] })),
      http.get('/api/dashboard', () =>
        HttpResponse.json({
          counts: { todo: 3, in_progress: 1, done: 2, overdue: 1 },
          insights: {
            projectCount: 2,
            dueThisWeek: 1,
            completedLast7Days: 2,
            oldestOverdueDays: 4,
          },
          byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
          completedByDay: [],
          overdue: [],
          myTasks: [],
        }),
      ),
    );
    renderWithProviders(<AppRoutes />, { route: '/login' });
    await userEvent.click(await screen.findByTestId('login-demo-admin'));
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(await screen.findByTestId('stat-card-todo')).toHaveAttribute('data-value', '3');
    expect(screen.getByTestId('stat-card-overdue')).toHaveAttribute('data-value', '1');
  });
});

describe('routing and roles', () => {
  it('redirects signed-out visitors from /app to the login page', async () => {
    mockSession(null);
    renderWithProviders(<AppRoutes />, { route: '/app/dashboard' });
    expect(await screen.findByTestId('login-submit')).toBeInTheDocument();
  });

  it('redirects signed-in users away from /login', async () => {
    mockSession(adminUser);
    server.use(
      http.get('/api/projects', () => HttpResponse.json({ projects: [] })),
      http.get('/api/dashboard', () => new Promise(() => {})),
    );
    renderWithProviders(<AppRoutes />, { route: '/login' });
    expect(await screen.findByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders the 404 page for unknown routes', async () => {
    mockSession(null);
    renderWithProviders(<AppRoutes />, { route: '/nope/nothing' });
    expect(await screen.findByTestId('not-found-page')).toBeInTheDocument();
  });

  it('hides the admin Members tab from regular members', async () => {
    mockSession(memberUser);
    server.use(http.get('/api/projects', () => HttpResponse.json({ projects: [] })));
    renderWithProviders(<AppRoutes />, { route: '/app/settings' });
    expect(await screen.findByTestId('settings-tab-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-tab-members')).not.toBeInTheDocument();
  });

  it('shows the admin Members tab to admins', async () => {
    mockSession(adminUser);
    server.use(http.get('/api/projects', () => HttpResponse.json({ projects: [] })));
    renderWithProviders(<AppRoutes />, { route: '/app/settings' });
    expect(await screen.findByTestId('settings-tab-members')).toBeInTheDocument();
  });
});
