import type { Status } from '@/api/client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface ShellValue {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  newProjectOpen: boolean;
  setNewProjectOpen: (open: boolean) => void;
  newTaskOpen: boolean;
  newTaskStatus: Status;
  setNewTaskOpen: (open: boolean) => void;
  openNewTask: (status?: Status) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const ShellContext = createContext<ShellValue | null>(null);
const KEY = 'tf-sidebar';

function initialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'collapsed') return true;
    if (saved === 'expanded') return false;
  } catch {
    /* ignore */
  }
  // Tablet widths start as the icon rail.
  return window.innerWidth < 1024;
}

/** UI state shared by the shell, command palette, shortcuts and pages that open dialogs. */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<Status>('todo');
  const [sidebarCollapsed, setCollapsed] = useState(initialCollapsed);

  const value = useMemo<ShellValue>(() => {
    const setSidebarCollapsed = (c: boolean) => {
      setCollapsed(c);
      try {
        localStorage.setItem(KEY, c ? 'collapsed' : 'expanded');
      } catch {
        /* ignore */
      }
    };
    return {
      paletteOpen,
      setPaletteOpen,
      shortcutsOpen,
      setShortcutsOpen,
      newProjectOpen,
      setNewProjectOpen,
      newTaskOpen,
      newTaskStatus,
      setNewTaskOpen,
      openNewTask: (status = 'todo') => {
        setNewTaskStatus(status);
        setNewTaskOpen(true);
      },
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
    };
  }, [paletteOpen, shortcutsOpen, newProjectOpen, newTaskOpen, newTaskStatus, sidebarCollapsed]);

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside ShellProvider');
  return ctx;
}
