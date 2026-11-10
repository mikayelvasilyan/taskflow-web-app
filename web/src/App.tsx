import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { isApiError } from '@/api/client';
import { TooltipProvider } from '@/components/ui/menu';
import { AppShell } from '@/components/layout/AppShell';
import { FullScreenLoader, GuestRoute, ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AuthProvider } from '@/hooks/useAuth';
import { ShellProvider } from '@/hooks/useShell';
import { ThemeProvider } from '@/hooks/useTheme';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Signup from '@/pages/Signup';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const MyTasks = lazy(() => import('@/pages/MyTasks'));
const ProjectLayout = lazy(() => import('@/pages/ProjectLayout'));
const ProjectBoard = lazy(() => import('@/pages/ProjectBoard'));
const ProjectList = lazy(() => import('@/pages/ProjectList'));
const ProjectSettings = lazy(() => import('@/pages/ProjectSettings'));
const Settings = lazy(() => import('@/pages/Settings'));

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => !(isApiError(err) && err.status < 500) && count < 2,
      },
    },
  });
}

export function AppRoutes() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route
            path="/app"
            element={
              <ShellProvider>
                <AppShell />
              </ShellProvider>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<Navigate to="board" replace />} />
              <Route path="board" element={<ProjectBoard />} />
              <Route path="list" element={<ProjectList />} />
              <Route path="settings" element={<ProjectSettings />} />
            </Route>
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound inShell />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <Toaster
              position="bottom-right"
              offset={{ bottom: 72, right: 16 }}
              mobileOffset={{ bottom: 72, left: 16, right: 16 }}
            />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
