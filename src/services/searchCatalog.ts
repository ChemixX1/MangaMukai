import type { MangaCapitulo } from '../types/manga';
import { buildViewsIndex, withKnownViews } from '../utils/seriesViews';
import { getPopularMenByViews, getPopularWomenByViews, getUltimosCapitulos } from './mangaService';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { items: MangaCapitulo[]; expiresAt: number } | null = null;
let pending: Promise<MangaCapitulo[]> | null = null;

export const getCachedSearchCatalog = () =>
  cached && cached.expiresAt > Date.now() ? cached.items : null;

/** La precarga y el buscador comparten datos enriquecidos y la petición en curso. */
export const loadSearchCatalog = (): Promise<MangaCapitulo[]> => {
  const items = getCachedSearchCatalog();
  if (items) return Promise.resolve(items);
  if (pending) return pending;
  pending = Promise.all([
    getUltimosCapitulos(),
    getPopularWomenByViews('historical', false),
    getPopularMenByViews('historical', false),
  ]).then(([catalog, women, men]) => {
    const result = withKnownViews(catalog, buildViewsIndex(women, men));
    // Un fallo de red no se conserva como catálogo vacío durante cinco minutos.
    if (result.length) cached = { items: result, expiresAt: Date.now() + CACHE_TTL_MS };
    return result;
  }).finally(() => { pending = null; });
  return pending;
};
