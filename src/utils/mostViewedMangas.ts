import type { MangaCapitulo } from '../types/manga';

export const mostViewedMangas = (items: MangaCapitulo[], limit = 2): MangaCapitulo[] => {
  const series = new Map<string, MangaCapitulo>();
  for (const manga of items) {
    const views = manga.totalViews;
    if (typeof views !== 'number' || !Number.isFinite(views) || views <= 0) continue;
    const id = String(manga.eroSeri || manga.id);
    if (views > (series.get(id)?.totalViews ?? 0)) series.set(id, manga);
  }
  return [...series.values()]
    .sort((a, b) => (b.totalViews ?? 0) - (a.totalViews ?? 0) || String(a.eroSeri || a.id).localeCompare(String(b.eroSeri || b.id), 'en', { numeric: true }))
    .slice(0, Math.max(0, limit));
};
