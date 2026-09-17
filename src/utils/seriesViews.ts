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

/* Vistas que se muestran al usuario mientras la cifra real no llega a 1K. */
export const REAL_VIEWS_THRESHOLD = 1000;
const PLACEHOLDER_VIEWS_MIN = 2000;
const PLACEHOLDER_VIEWS_MAX = 10000;

/** Hash FNV-1a de la clave de la serie: la misma serie da siempre la misma cifra. */
const hashSeriesKey = (key: string) => {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/**
 * Vistas a mostrar. Por debajo de 1K reales (series nuevas, capítulos sin
 * contador aún) se enseña una cifra fija por serie entre 2K y 10K, distinta de
 * una a otra; en cuanto las reales superan 1K, mandan ellas y la cifra
 * provisional desaparece sola.
 */
export const displayViews = (manga: Pick<MangaCapitulo, 'id' | 'eroSeri' | 'totalViews'>) => {
  const real = manga.totalViews ?? 0;
  if (real >= REAL_VIEWS_THRESHOLD) return real;
  const span = PLACEHOLDER_VIEWS_MAX - PLACEHOLDER_VIEWS_MIN + 1;
  return PLACEHOLDER_VIEWS_MIN + (hashSeriesKey(seriesKey(manga)) % span);
};

/* Vistas por capítulo: el contador propio arranca casi vacío, así que por debajo
   de 1K reales se enseña una cifra fija por capítulo entre 1K y 10K. */
const CHAPTER_PLACEHOLDER_MIN = 1000;
const CHAPTER_PLACEHOLDER_MAX = 10000;

export const displayChapterViews = (chapterId: number | string, realViews = 0) => {
  if (realViews >= REAL_VIEWS_THRESHOLD) return realViews;
  const span = CHAPTER_PLACEHOLDER_MAX - CHAPTER_PLACEHOLDER_MIN + 1;
  return CHAPTER_PLACEHOLDER_MIN + (hashSeriesKey(`chapter:${chapterId}`) % span);
};
