import { useEffect, useSyncExternalStore } from 'react';

import { AUTH_CHANGED_EVENT, getStoredToken } from './authService';
import { getInteractions, toggleBookmarkWithTotal } from './interactionsService';

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

let inflight: Promise<void> | null = null;

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

 const ensureSavedMangas = (): Promise<void> => {
  if (inflight) return inflight;
  if (loadedToken === (getStoredToken() ?? '')) return Promise.resolve();
  return fetchSaved();
};

export const seedSavedMangas = (ids: ReadonlyArray<string | number>) => {
  loadedToken = getStoredToken() ?? '';
  setState({ ids: ids.map(String), loaded: true });
};

if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (loadedToken !== null && loadedToken !== (getStoredToken() ?? '')) void fetchSaved();
  });
}

export type ToggleSavedOutcome =
  | { status: 'login' }
  | { status: 'busy' }
  | { status: 'error' }
  | { status: 'ok'; action: 'added' | 'removed'; total: number };

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

export const useSavedMangasState = (enabled = true): SavedMangasState => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (enabled) void ensureSavedMangas();
  }, [enabled]);

  return snapshot;
};
