export interface ChapterMetadata {
  id: string;
  mangaId: string;
  title: string;
  number: number;
}

// Public facts already shown in cards, independent of reader access and image caches.
const chapters = new Map<string, ChapterMetadata>();
const MAX_CHAPTERS = 5000;

export function createChapterMetadata(id: string | number, mangaId: string | number, number: unknown, title = ''): ChapterMetadata | undefined {
  const parsed = typeof number === 'number' ? number
    : typeof number === 'string' && number.trim() ? Number(number.trim().replace(',', '.')) : NaN;
  if (!id || !mangaId || !Number.isFinite(parsed) || parsed < 0) return;
  return { id: String(id), mangaId: String(mangaId), number: parsed, title: title || `Capítulo ${parsed}` };
}

export function rememberChapterMetadata(id: string | number, mangaId: string | number, number: unknown, title = '') {
  const metadata = createChapterMetadata(id, mangaId, number, title);
  if (!metadata) return;
  const key = metadata.id;
  chapters.delete(key);
  chapters.set(key, metadata);
  if (chapters.size > MAX_CHAPTERS) chapters.delete(chapters.keys().next().value!);
}

export const peekChapterMetadata = (id: string) => chapters.get(id);

/** Router history carries the clicked card's public facts across remounts/reloads. */
export function readChapterNavigationState(state: unknown, chapterId: string): ChapterMetadata | undefined {
  if (!state || typeof state !== 'object' || !('readerChapter' in state)) return;
  const chapter = state.readerChapter;
  if (!chapter || typeof chapter !== 'object' || !('id' in chapter) || String(chapter.id) !== chapterId ||
    !('mangaId' in chapter) || !['string', 'number'].includes(typeof chapter.mangaId) || !('number' in chapter)) return;
  return createChapterMetadata(chapterId, chapter.mangaId as string | number, chapter.number,
    'title' in chapter && typeof chapter.title === 'string' ? chapter.title : '');
}
