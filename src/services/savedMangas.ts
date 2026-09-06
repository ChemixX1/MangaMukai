import { useEffect, useSyncExternalStore } from 'react';

import { AUTH_CHANGED_EVENT, getStoredToken } from './authService';
import { getInteractions, toggleBookmarkWithTotal } from './interactionsService';

/**
 * Lista de mangas guardados del usuario, compartida por toda la web.
 *
 * Todos los botones "Guardar" (home, B&N, +19, ficha) y la página de guardados
 * leen y escriben aquí, así que un manga guardado en un sitio aparece guardado
 * en todos los demás sin recargar. La fuente de verdad es el endpoint
 * /bookmark de WordPress; el estado local solo adelanta el resultado.
 */
export interface SavedMangasState {
  ids: readonly string[];
  loaded: boolean;
  busyIds: readonly string[];
}

let state: SavedMangasState = { ids: [], loaded: false, busyIds: [] };
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setState = (patch: Partial<SavedMangasState>) => {
  state = { ...state, ...patch };
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

const withId = (ids: readonly string[], id: string) => (ids.includes(id) ? ids : [...ids, id]);
const withoutId = (ids: readonly string[], id: string) => ids.filter((item) => item !== id);

// --- Carga -------------------------------------------------------------------

let inflight: Promise<void> | null = null;
/** Token con el que se cargó la lista; si cambia, se vuelve a pedir. */
let loadedToken: string | null = null;

const fetchSaved = (): Promise<void> => {
  const token = getStoredToken() ?? '';
  if (!token) {
    loadedToken = '';
    setState({ ids: [], loaded: true });
    return Promise.resolve();
  }

  inflight = getInteractions()
    .then((interactions) => {
      loadedToken = token;
      setState({ ids: (interactions?.bookmarks ?? []).map(String), loaded: true });
    })
    .catch(() => {
      setState({ loaded: true });
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
};

/** Carga la lista una sola vez por sesión. */
export const ensureSavedMangas = (): Promise<void> => {
  if (inflight) return inflight;
  if (loadedToken === (getStoredToken() ?? '')) return Promise.resolve();
  return fetchSaved();
};

/** Sustituye la lista con la que acaba de devolver /interactions (la ficha ya la pide). */
export const seedSavedMangas = (ids: ReadonlyArray<string | number>) => {
  loadedToken = getStoredToken() ?? '';
  setState({ ids: ids.map(String), loaded: true });
};

if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (loadedToken !== null && loadedToken !== (getStoredToken() ?? '')) void fetchSaved();
  });
}

// --- Acciones ----------------------------------------------------------------

export type ToggleSavedOutcome =
  | { status: 'login' }
  | { status: 'busy' }
  | { status: 'error' }
  | { status: 'ok'; action: 'added' | 'removed'; total: number };

export const isMangaSaved = (mangaId: string | number) => state.ids.includes(String(mangaId));

/** Guarda o quita un manga: adelanta el cambio y lo confirma con el servidor. */
export const toggleSavedManga = async (mangaId: string | number): Promise<ToggleSavedOutcome> => {
  const id = String(mangaId);
  if (!getStoredToken()) return { status: 'login' };
  if (state.busyIds.includes(id)) return { status: 'busy' };

  const wasSaved = state.ids.includes(id);
  setState({
    busyIds: [...state.busyIds, id],
    ids: wasSaved ? withoutId(state.ids, id) : withId(state.ids, id),
  });

  const result = await toggleBookmarkWithTotal(id);
  if (!result) {
    setState({
      busyIds: withoutId(state.busyIds, id),
      ids: wasSaved ? withId(state.ids, id) : withoutId(state.ids, id),
    });
    return { status: 'error' };
  }

  setState({
    busyIds: withoutId(state.busyIds, id),
    ids: result.action === 'added' ? withId(state.ids, id) : withoutId(state.ids, id),
  });
  return { status: 'ok', action: result.action, total: result.total };
};

// --- Hook --------------------------------------------------------------------

export const useSavedMangasState = (): SavedMangasState => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void ensureSavedMangas();
  }, []);

  return snapshot;
};
