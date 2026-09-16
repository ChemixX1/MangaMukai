import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "mangamukai-theme";
const THEME_CHANGED_EVENT = "mangamukai:theme-changed";

function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  // Las reglas `.home-theme-* .home-...` del CSS cuelgan de <html>, así la portada
  // cambia de tema solo con CSS, sin re-renderizar todo su árbol de React.
  root.classList.toggle("home-theme-dark", theme === "dark");
  root.classList.toggle("home-theme-light", theme === "light");
  root.style.colorScheme = theme;
}

/**
 * Cambia el tema en un solo repintado: mientras se aplica la clase se
 * suspenden las transiciones CSS (`.theme-switching`) para no animar cientos de
 * `transition-colors` a la vez, que era lo que hacía sentir pesado el cambio.
 */
function applyThemeInstantly(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  applyTheme(theme);
  const release = () => root.classList.remove("theme-switching");
  window.requestAnimationFrame(() => window.requestAnimationFrame(release));
  // rAF no corre con la pestaña en segundo plano; el temporizador garantiza la salida.
  window.setTimeout(release, 160);
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
    applyThemeInstantly(nextTheme);
    window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGED_EVENT, { detail: nextTheme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(theme === "light" ? "dark" : "light");
  }, [setThemeMode, theme]);

  return { theme, setTheme: setThemeMode, toggleTheme };
};
