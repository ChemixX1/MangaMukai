import type { MangaCapitulo } from '../types/manga';
import { buildViewsIndex, withKnownViews } from '../utils/seriesViews';
import { getPopularMenByViews, getPopularWomenByViews, getUltimosCapitulos } from './mangaService';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { items: MangaCapitulo[]; expiresAt: number } | null = null;
let pending: Promise<MangaCapitulo[]> | null = null;
const listeners = new Set<(items: MangaCapitulo[]) => void>();

export const subscribeSearchCatalog = (listener: (items: MangaCapitulo[]) => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const getCachedSearchCatalog = () =>
  cached && cached.expiresAt > Date.now() ? cached.items : null;

export const loadSearchCatalog = (): Promise<MangaCapitulo[]> => {
  const items = getCachedSearchCatalog();
  if (items) return Promise.resolve(items);
  if (pending) return pending;
  pending = getUltimosCapitulos().then((catalog) => {
    if (!catalog.length) return catalog;
    const entry = { items: catalog, expiresAt: Date.now() + CACHE_TTL_MS };
    cached = entry;
    listeners.forEach(listener => listener(catalog));
    void Promise.allSettled([
      getPopularWomenByViews('historical', false),
      getPopularMenByViews('historical', false),
    ]).then((rankings) => {
      if (cached !== entry) return;
      entry.items = withKnownViews(catalog, buildViewsIndex(...rankings.map(result => result.status === 'fulfilled' ? result.value : [])));
      listeners.forEach(listener => listener(entry.items));
    });
    return catalog;
  }).finally(() => { pending = null; });
  return pending;
};
