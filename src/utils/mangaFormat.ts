import type { MangaCapitulo } from '../types/manga';

export const cleanTitle = (text: string) => {
  if (!text) return '';
  return text.replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '').trim();
};

export const formatViewsEs = (views: number, alwaysCompact = false) => {

  if (views >= 999_950) return `${(views / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (views >= 1_000 || alwaysCompact) return `${(views / 1_000).toFixed(1).replace('.', ',')}K`;
  return String(views);
};

export const formatHomeViews = (views: number) => {
  const count = Number.isFinite(views) ? Math.max(0, Math.floor(views)) : 0;
  if (count >= 1_000_000) return `${Math.floor(count / 1_000_000)}M`;
  if (count >= 1_000) return `${Math.floor(count / 1_000)}K`;
  return String(count);
};

const DAY_MS = 24 * 60 * 60 * 1000;

 const daysSince = (dateString: string) => {
  const past = new Date(dateString).getTime();
  if (!dateString || Number.isNaN(past)) return Number.NaN;
  return Math.max(0, Math.floor((Date.now() - past) / DAY_MS));
};

export const isRecentChapter = (dateString: string) => {
  const days = daysSince(dateString);
  return !Number.isNaN(days) && days <= 7;
};

export const timeAgoDaysEs = (dateString: string) => {
  const days = daysSince(dateString);
  if (Number.isNaN(days)) return '—';
  if (days === 0) return 'Hoy';
  if (days === 1) return '1 Día';
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return years === 1 ? '1 Año' : `${years} Años`;
  }
  return `${days} Días`;
};

export const isPublishedChapter = (chapter: { id: number | string; numero: string }) =>
  Number(chapter.numero) > 0 && Number(chapter.id) > 0;

export type MangaTypeTab = 'Manga' | 'Manhua' | 'Manhwa';
export const TYPE_TABS: MangaTypeTab[] = ['Manga', 'Manhua', 'Manhwa'];

export const matchesTypeTab = (mangaType: string | undefined, tab: MangaTypeTab) => {
  const type = (mangaType || 'Manga').toLowerCase();
  if (tab === 'Manhwa') return type.includes('manhwa');
  if (tab === 'Manhua') return type.includes('manhua');

  return !type.includes('manhwa') && !type.includes('manhua');
};

export const uniqueBySeries = <T extends Pick<MangaCapitulo, 'id' | 'eroSeri'>>(lists: T[][], limit: number): T[] => {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const list of lists) {
    for (const manga of list) {
      const key = String(manga.eroSeri || manga.id);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(manga);
      if (merged.length >= limit) return merged;
    }
  }
  return merged;
};
