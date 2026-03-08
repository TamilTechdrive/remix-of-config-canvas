import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'configflow-dark-mode';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Apply class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Secret shortcut: Ctrl+Shift+L
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        toggle();
        toast.success(isDark ? '☀️ Light mode activated' : '🌙 Dark mode activated', {
          duration: 1500,
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle, isDark]);

  return { isDark, toggle };
}
