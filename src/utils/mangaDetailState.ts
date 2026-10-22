import type { MangaCapitulo } from '../types/manga';
import type { SeriesChapter } from '../services/mangaService';
import { filterYouthMen } from './youthFilter';
import { hasHotTag } from './womenBlackWhite';

export function mangaDetailAccent(manga: MangaCapitulo | null, source?: unknown): 'pink' | 'cyan' | 'hot' {
  if (manga && hasHotTag(manga)) return 'hot';
  if (source === 'cyan' || source === 'pink') return source;
  return manga && filterYouthMen([manga]).length ? 'cyan' : 'pink';
}

export function knownFirstChapterId(manga: MangaCapitulo | null, chapters?: SeriesChapter[]): number | undefined {
  // A complete list (including an empty one) takes precedence over home hints.
  if (chapters) return [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)[0]?.id;
  if (manga?.firstChapterId && manga.firstChapterId > 0) return manga.firstChapterId;
  return manga?.capitulosRecientes.find(chapter => chapter.id > 0 && Number(chapter.numero) === 1)?.id;
}

export function hasKnownChapters(manga: MangaCapitulo | null): boolean {
  return Boolean(manga && (manga.firstChapterId || (manga.chapterCount ?? 0) > 0 || manga.capitulosRecientes.some(chapter => chapter.id > 0)));
}
