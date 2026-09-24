import type { MangaCapitulo } from '../types/manga';

/** Quita "Capítulo N" y similares del título de la serie. */
export const cleanTitle = (text: string) => {
  if (!text) return '';
  return text.replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '').trim();
};

/** "7,7K" / "1,2M" (coma decimal, sin decimales por debajo de mil). */
export const formatViewsEs = (views: number) => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1).replace('.', ',')}K`;
  return String(views);
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días transcurridos desde la fecha (NaN si no es una fecha válida). */
export const daysSince = (dateString: string) => {
  const past = new Date(dateString).getTime();
  if (!dateString || Number.isNaN(past)) return Number.NaN;
  return Math.max(0, Math.floor((Date.now() - past) / DAY_MS));
};

/** Con siete días o menos el capítulo se marca como "NUEVO". */
export const isRecentChapter = (dateString: string) => {
  const days = daysSince(dateString);
  return !Number.isNaN(days) && days <= 7;
};

/**
 * "Hoy", "3 Días" … "29 Días", "1 Mes" … "11 Meses", "1 Año": sin semanas; a los
 * 30 días pasa a meses y a los 12 meses a años.
 */
export const timeAgoEs = (dateString: string) => {
  const days = daysSince(dateString);
  if (Number.isNaN(days)) return '—';
  if (days === 0) return 'Hoy';
  if (days < 30) return days === 1 ? '1 Día' : `${days} Días`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 Mes' : `${months} Meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 Año' : `${years} Años`;
};

/**
 * Los listados marcan las series sin capítulos con una fila vacía
 * (`numero: "-"`, id 0). Esa fila no puede abrir el lector: lleva a la ficha.
 */
export const isPublishedChapter = (chapter: { id: number | string; numero: string }) =>
  Number(chapter.numero) > 0 && Number(chapter.id) > 0;

/** Pestañas de tipo de obra de "Lo Más Reciente". */
export type MangaTypeTab = 'Manga' | 'Manhua' | 'Manhwa';
export const TYPE_TABS: MangaTypeTab[] = ['Manga', 'Manhua', 'Manhwa'];

export const matchesTypeTab = (mangaType: string | undefined, tab: MangaTypeTab) => {
  const type = (mangaType || 'Manga').toLowerCase();
  if (tab === 'Manhwa') return type.includes('manhwa');
  if (tab === 'Manhua') return type.includes('manhua');
  // "Manga" agrupa todo lo que no es manhua ni manhwa (novelas incluidas).
  return !type.includes('manhwa') && !type.includes('manhua');
};

/** Una sola entrada por serie, conservando el orden de llegada. */
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
