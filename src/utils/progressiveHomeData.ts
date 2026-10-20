import type { MangaCapitulo } from '../types/manga';

export const HOME_LISTS = ['popularHistorical', 'popularWeekly', 'latestWomen', 'popularMenHistorical', 'popularMenWeekly', 'latestMen', 'newReleases'] as const;
export type HomeList = typeof HOME_LISTS[number];
export type HomeLists = Record<HomeList, MangaCapitulo[]>;
export interface HomeSnapshot extends HomeLists {
  loaded: Record<HomeList, boolean>;
  isReady: boolean;
  isOutage: boolean;
}

const emptySnapshot = (): HomeSnapshot => ({
  popularHistorical: [], popularWeekly: [], latestWomen: [],
  popularMenHistorical: [], popularMenWeekly: [], latestMen: [], newReleases: [],
  loaded: Object.fromEntries(HOME_LISTS.map(key => [key, false])) as Record<HomeList, boolean>,
  isReady: false, isOutage: false,
});

export const createHomeDataLoader = (
  fetchers: Record<HomeList, () => Promise<MangaCapitulo[]>>,
  priorityWindowMs = 1200,
  cacheTtlMs = 60 * 1000,
) => {
  let snapshot = emptySnapshot();
  let pending: Promise<void> | null = null;
  let expiresAt = 0;
  const listeners = new Set<(data: HomeSnapshot) => void>();

  const waitForPriority = (requests: Promise<void>[]) => new Promise<void>(resolve => {
    const timer = setTimeout(resolve, priorityWindowMs);
    void Promise.all(requests).then(() => { clearTimeout(timer); resolve(); });
  });
  const publish = (next: HomeSnapshot) => {
    snapshot = next;
    listeners.forEach(listener => listener(snapshot));
  };
  const loadList = async (key: HomeList) => {
    let items: MangaCapitulo[];
    try { items = await fetchers[key](); } catch { items = []; }
    const loaded = { ...snapshot.loaded, [key]: true };
    // A refresh keeps already visible content when the service is temporarily unavailable.
    const next = { ...snapshot, [key]: items.length > 0 ? items : snapshot[key], loaded };
    next.isReady = HOME_LISTS.every(list => loaded[list]);
    next.isOutage = next.isReady && HOME_LISTS.every(list => next[list].length === 0);
    publish(next);
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: (data: HomeSnapshot) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    load(): Promise<void> {
      if (pending) return pending;
      if (snapshot.isReady && !snapshot.isOutage && expiresAt > Date.now()) return Promise.resolve();
      if (snapshot.isOutage) publish(emptySnapshot());
      pending = (async () => {
        const priority = [loadList('popularHistorical'), loadList('popularWeekly')];
        await waitForPriority(priority);
        const lower = [loadList('latestWomen'),
          loadList('popularMenHistorical'), loadList('popularMenWeekly'),
          loadList('latestMen'), loadList('newReleases'),
        ];
        await Promise.all([...priority, ...lower]);
        expiresAt = Date.now() + cacheTtlMs;
      })().finally(() => { pending = null; });
      return pending;
    },
  };
};
