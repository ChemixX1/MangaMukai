import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "mangamukai-theme";
const THEME_CHANGED_EVENT = "mangamukai:theme-changed";

function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event: Event) => {
      const nextTheme = (event as CustomEvent<ThemeMode>).detail;
      setTheme(nextTheme || readTheme());
    };

    window.addEventListener(THEME_CHANGED_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, syncTheme);
  }, []);

  const setThemeMode = useCallback((nextTheme: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGED_EVENT, { detail: nextTheme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(theme === "light" ? "dark" : "light");
  }, [setThemeMode, theme]);

  return { theme, setTheme: setThemeMode, toggleTheme };
};
