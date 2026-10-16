import { useEffect, useSyncExternalStore } from "react";

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
let themeChangeVersion = 0;

function applyThemeInstantly(theme: ThemeMode) {
  const version = ++themeChangeVersion;
  const root = document.documentElement;
  root.classList.add("theme-switching");
  applyTheme(theme);
  const release = () => {
    if (version === themeChangeVersion) root.classList.remove("theme-switching");
  };
  window.requestAnimationFrame(() => window.requestAnimationFrame(release));
  // rAF no corre con la pestaña en segundo plano; el temporizador garantiza la salida.
  window.setTimeout(release, 160);
}

function subscribeTheme(onChange: () => void) {
  const syncStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    applyThemeInstantly(readTheme());
    onChange();
  };
  window.addEventListener(THEME_CHANGED_EVENT, onChange);
  window.addEventListener("storage", syncStorage);
  return () => {
    window.removeEventListener(THEME_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", syncStorage);
  };
}

function setThemeMode(nextTheme: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, nextTheme);
  applyThemeInstantly(nextTheme);
  window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGED_EVENT, { detail: nextTheme }));
}

function toggleTheme() {
  // Leer el estado actual evita reutilizar el tema de un render anterior.
  setThemeMode(readTheme() === "light" ? "dark" : "light");
}

const serverTheme = (): ThemeMode => "light";

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);

  useEffect(() => {
    applyTheme(readTheme());
  }, []);

  return { theme, setTheme: setThemeMode, toggleTheme };
};
