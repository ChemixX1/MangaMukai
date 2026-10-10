import type { MangaCapitulo } from '../types/manga';
import { uniqueBySeries } from './mangaFormat';

/** Ordena todas las candidatas antes de recortar, conservando una entrada por serie. */
export const rankSeriesByViews = (primary: MangaCapitulo[], fallback: MangaCapitulo[], size: number) =>
  uniqueBySeries([primary, fallback], Infinity)
    .sort((a, b) => (b.totalViews ?? 0) - (a.totalViews ?? 0))
    .slice(0, size);

export const formatChapterCount = (count: number | null) =>
  count === null ? '— Capítulos' : `${count} ${count === 1 ? 'Capítulo' : 'Capítulos'}`;
