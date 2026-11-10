import { LogOut, Moon, Search, Settings, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/components/ui/menu';
import { useAuth } from '@/hooks/useAuth';
import { useShell } from '@/hooks/useShell';
import { useTheme } from '@/hooks/useTheme';
import { tid } from '@/lib/testids';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

export function TopBar() {
  const { user, logout } = useAuth();
  const { setPaletteOpen } = useShell();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
      <span className="md:hidden">
        <Logo size={26} />
      </span>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        data-testid={tid.searchTrigger}
        className="flex h-9 min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-left text-base text-fg-subtle transition-colors hover:border-border-strong"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Search projects and tasks</span>
        <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium text-fg-muted sm:inline">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-testid={tid.themeToggle}
          >
            {resolved === 'dark' ? (
              <Sun className="size-4.5" aria-hidden />
            ) : (
              <Moon className="size-4.5" aria-hidden />
            )}
          </Button>
        </Tooltip>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open user menu"
                data-testid={tid.userMenu}
                className="ml-1 rounded-full"
              >
                <Avatar person={user} size="md" className="ring-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                <span className="flex items-center gap-2 text-base font-semibold text-fg">
                  {user.name}
                  <Badge tone={user.role === 'admin' ? 'accent' : 'neutral'}>{user.role}</Badge>
                </span>
                <span className="font-normal">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navigate('/app/settings')}
                data-testid={tid.userMenuSettings}
              >
                <Settings className="size-4" aria-hidden /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onLogout} data-testid={tid.userMenuLogout}>
                <LogOut className="size-4" aria-hidden /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
