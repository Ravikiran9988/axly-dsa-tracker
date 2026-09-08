/**
 * ThemeContext — Single global theme source of truth.
 *
 * Reads from / writes to localStorage key "axly-theme".
 * Default: "dark".
 *
 * Apply this Provider once at the root (main.jsx or App.jsx wrapper).
 * All components consume via useTheme().
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'axly-theme';
const DEFAULT_THEME = 'dark';

/**
 * Reads the stored theme and applies it synchronously to document.documentElement.
 * Called both from the inline FOUC-prevention script AND from React bootstrap.
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
}

/** Read persisted preference, fallback to DEFAULT_THEME */
function readPersistedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return DEFAULT_THEME;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const t = readPersistedTheme();
    // Apply immediately to avoid FOUC on React re-render
    applyTheme(t);
    return t;
  });

  const isDark = theme === 'dark';

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  const setThemeExplicit = useCallback((value) => {
    if (value !== 'dark' && value !== 'light') return;
    setTheme(value);
    applyTheme(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
  }, []);

  // Keep document in sync on every render just in case
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme: setThemeExplicit }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** useTheme — consume the global theme context */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback if used outside provider (e.g. standalone pages)
    const t = readPersistedTheme();
    return {
      theme: t,
      isDark: t === 'dark',
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}
