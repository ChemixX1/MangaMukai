import type { MangaCapitulo } from '../types/manga';

const seriesKey = (manga: Pick<MangaCapitulo, 'id' | 'eroSeri'>) => String(manga.eroSeri || manga.id);

export const buildViewsIndex = (...lists: MangaCapitulo[][]) => {
  const index = new Map<string, number>();
  lists.forEach((list) => list.forEach((manga) => {
    const views = manga.totalViews ?? 0;
    if (views <= 0) return;
    const key = seriesKey(manga);
    if (views > (index.get(key) ?? 0)) index.set(key, views);
  }));
  return index;
};

export const withKnownViews = <T extends MangaCapitulo>(items: T[], index: Map<string, number>): T[] =>
  items.map((manga) => {
    const known = index.get(seriesKey(manga)) ?? 0;
    return known > (manga.totalViews ?? 0) ? { ...manga, totalViews: known } : manga;
  });

 const REAL_VIEWS_THRESHOLD = 1000;
const PLACEHOLDER_VIEWS_MIN = 2000;
const PLACEHOLDER_VIEWS_MAX = 10000;

const hashSeriesKey = (key: string) => {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const displayViews = (manga: Pick<MangaCapitulo, 'id' | 'eroSeri' | 'totalViews'>) => {
  const real = manga.totalViews ?? 0;
  if (real >= REAL_VIEWS_THRESHOLD) return real;
  const span = PLACEHOLDER_VIEWS_MAX - PLACEHOLDER_VIEWS_MIN + 1;
  return PLACEHOLDER_VIEWS_MIN + (hashSeriesKey(seriesKey(manga)) % span);
};
