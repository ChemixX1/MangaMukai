import type { MangaCapitulo } from '../types/manga';

const seriesKey = (manga: Pick<MangaCapitulo, 'id' | 'eroSeri'>) => String(manga.eroSeri || manga.id);

/**
 * Vistas conocidas por serie, con la cifra más alta de todas las listas.
 *
 * Solo los rankings de populares traen `totalViews`; las últimas
 * actualizaciones y el catálogo llegan sin él, así que el mismo manga puede
 * aparecer con vistas en una lista y con 0 en otra según de dónde salga.
 */
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

/** Completa `totalViews` con la cifra del índice cuando el manga llega sin ella o con una menor. */
export const withKnownViews = <T extends MangaCapitulo>(items: T[], index: Map<string, number>): T[] =>
  items.map((manga) => {
    const known = index.get(seriesKey(manga)) ?? 0;
    return known > (manga.totalViews ?? 0) ? { ...manga, totalViews: known } : manga;
  });
