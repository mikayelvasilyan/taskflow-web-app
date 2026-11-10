import { useEffect, useRef } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { useShell } from '@/hooks/useShell';

const typing = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
};

/** Registers the app's keyboard shortcuts. Letter shortcuts are ignored while typing or when a dialog is open. */
export function GlobalShortcuts() {
  const navigate = useNavigate();
  const inProject = useMatch('/app/projects/:projectId/*');
  const { paletteOpen, setPaletteOpen, setShortcutsOpen, toggleSidebar, openNewTask } = useShell();
  const pendingG = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Command palette works everywhere, even while typing.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;

      if (pendingG.current) {
        clearTimeout(pendingG.current);
        pendingG.current = null;
        if (e.key === 'd') return void navigate('/app/dashboard');
        if (e.key === 'm') return void navigate('/app/my-tasks');
      }

      switch (e.key) {
        case 'g':
          pendingG.current = setTimeout(() => (pendingG.current = null), 1000);
          break;
        case 'c':
          if (inProject) {
            e.preventDefault();
            openNewTask('todo');
          }
          break;
        case '/':
          e.preventDefault();
          setPaletteOpen(true);
          break;
        case '[':
          toggleSidebar();
          break;
        case '?':
          setShortcutsOpen(true);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    navigate,
    inProject,
    paletteOpen,
    setPaletteOpen,
    setShortcutsOpen,
    toggleSidebar,
    openNewTask,
  ]);

  return null;
}
