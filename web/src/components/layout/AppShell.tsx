import { motion, useReducedMotion } from 'motion/react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { NewProjectDialog } from './NewProjectDialog';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { ShortcutsDialog } from './ShortcutsDialog';
import { GlobalShortcuts } from './GlobalShortcuts';

/** Sidebar + top bar + routed content. Phones swap the sidebar for a bottom navigation. */
export function AppShell() {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <a
        href="#main"
        className="sr-only z-[100] rounded-md bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="main"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-16 outline-none md:pb-0"
        >
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <BottomNav />
      <NewProjectDialog />
      <CommandPalette />
      <ShortcutsDialog />
      <GlobalShortcuts />
    </div>
  );
}
