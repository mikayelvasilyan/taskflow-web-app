import {
  CalendarClock,
  Command as CommandIcon,
  KanbanSquare,
  LayoutDashboard,
  MoonStar,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLockup } from '@/components/brand/Logo';
import { ProductVisual } from '@/components/common/ProductVisual';
import { notify } from '@/components/common/toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { tid } from '@/lib/testids';

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: KanbanSquare,
    title: 'Kanban that feels good',
    text: 'Drag cards between columns with a mouse, a finger or just the keyboard.',
  },
  {
    icon: CalendarClock,
    title: 'Due dates that make sense',
    text: 'See what is due tomorrow or two days overdue at a glance, not as a raw date.',
  },
  {
    icon: LayoutDashboard,
    title: 'A clear dashboard',
    text: 'Counts, a completion trend and your own tasks, all in one calm view.',
  },
  {
    icon: UsersRound,
    title: 'Roles and invites',
    text: 'Admins see everything. Members see their projects. Invite teammates by email.',
  },
  {
    icon: CommandIcon,
    title: 'Keyboard first',
    text: 'A command palette and a handful of shortcuts keep your hands where they are.',
  },
  {
    icon: MoonStar,
    title: 'Light and dark',
    text: 'Both themes are tuned for contrast, and motion respects your system settings.',
  },
];

export default function Landing() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const tryDemo = async () => {
    if (user) return navigate('/app/dashboard');
    setBusy(true);
    try {
      await login({ email: 'demo@taskflow.dev', password: 'Demo123!' });
      navigate('/app/dashboard');
    } catch {
      notify.error('The demo is not available right now. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" aria-label="TaskFlow home">
            <BrandLockup />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-2">
            {!user && (
              <Button asChild variant="ghost">
                <Link to="/login" data-testid={tid.landingLoginLink}>
                  Log in
                </Link>
              </Button>
            )}
            <Button
              variant="primary"
              onClick={tryDemo}
              loading={busy}
              data-testid={tid.landingDemoButton}
            >
              {user ? 'Open app' : 'Try the demo'}
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
          />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pb-16 pt-16 text-center md:px-6 md:pt-24">
            <div className="flex max-w-3xl flex-col items-center gap-5">
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-fg-muted">
                A personal portfolio project
              </span>
              <h1 className="text-5xl font-semibold leading-tight max-md:text-4xl md:text-6xl">
                Plan the work. <span className="text-accent-fg">See it move.</span>
              </h1>
              <p className="max-w-2xl text-lg text-fg-muted">
                TaskFlow is a task and project tracker for small teams: a drag-and-drop board, a
                focused list view and a dashboard that keeps everyone on the same page.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" variant="primary" onClick={tryDemo} loading={busy}>
                  {user ? 'Open app' : 'Try the demo'}
                </Button>
                {!user && (
                  <Button size="lg" asChild>
                    <Link to="/signup" data-testid={tid.landingSignupLink}>
                      Create an account
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="w-full max-w-4xl rounded-2xl border border-border bg-surface-2 p-2 shadow-lg md:p-3">
              <ProductVisual />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="mx-auto max-w-6xl px-4 py-16 md:px-6"
        >
          <h2 id="features-heading" className="mb-10 text-center text-4xl max-md:text-3xl">
            Everything a small team needs, nothing it does not
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-xs"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent-fg">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-base text-fg-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-fg-muted md:flex-row md:px-6">
          <p>A personal portfolio project by Mikayel Vasilyan.</p>
          <nav aria-label="Footer" className="flex gap-5">
            <a className="hover:text-fg" href="https://github.com/mikayelvasilyan/taskflow-web-app">
              GitHub
            </a>
            <a className="hover:text-fg" href="/docs">
              API docs
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
