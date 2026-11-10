import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Person, TaskListItem, User } from '@/api/client';
import { AuthProvider } from '@/hooks/useAuth';
import { ShellProvider } from '@/hooks/useShell';
import { ThemeProvider } from '@/hooks/useTheme';
import { TooltipProvider } from '@/components/ui/menu';
import { server } from './msw/server';

export const adminUser: User = {
  id: 'u-admin',
  email: 'demo@taskflow.dev',
  name: 'Alex Morgan',
  role: 'admin',
  avatarColor: '#475569',
  isProtected: true,
};
export const memberUser: User = {
  ...adminUser,
  id: 'u-member',
  email: 'member@taskflow.dev',
  name: 'Sam Rivera',
  role: 'member',
};

/** Answers GET /api/auth/me with the user, or 401 when signed out. */
export function mockSession(user: User | null) {
  server.use(
    http.get('/api/auth/me', () =>
      user
        ? HttpResponse.json({ user })
        : HttpResponse.json(
            { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } },
            { status: 401 },
          ),
    ),
  );
}

export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[route]}>
              <ShellProvider>{ui}</ShellProvider>
            </MemoryRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const person: Person = { id: 'p1', name: 'Mei Tanaka', avatarColor: '#7C3AED' };

export function makeTask(over: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id: 't1',
    key: 'WEB-1',
    number: 1,
    projectId: 'proj1',
    title: 'Audit landing page copy',
    status: 'todo',
    priority: 'high',
    dueDate: null,
    position: 1024,
    assignee: person,
    labels: [{ id: 'l1', name: 'content', color: '#CA8A04' }],
    commentCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    ...over,
  };
}
