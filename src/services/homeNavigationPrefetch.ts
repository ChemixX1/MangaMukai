import { NAVIGATION_CACHE_TTL_MS, NAVIGATION_CACHE_MAX_SERIES } from '../utils/navigationCachePolicy';
import type { MangaCapitulo } from '../types/manga';
import type { HomePrefetchStage, HomePrefetchTarget } from '../utils/homeNavigationQueue';
import { buildMangaRecommendations } from '../utils/mangaRecommendations';
import { preloadImages } from '../utils/preloadImages';
import { getAuthCacheKey } from './authService';
import { getInteractions } from './interactionsService';
import { getChapterEngagement, getMangaComments, type MangaComment } from './communityService';
import { getChaptersBySeries, getMangaById, peekKnownManga, peekSeriesChapters, getRelatedMangas, getUltimosCapitulos, type RelatedManga, type SeriesChapter } from './mangaService';
import { homeReaderSession, pauseHomeReaderSession, peekHomeReaderChapters } from './readerPrefetchSession';

interface PreparedDetail {
  manga: MangaCapitulo;
  chapters?: SeriesChapter[];
  related?: RelatedManga[];
  comments?: MangaComment[];
}
const preparedDetails = new Map<string, { data: PreparedDetail; owner: string; loadedAt: number; commentsAt?: number }>();
const DETAIL_TTL = NAVIGATION_CACHE_TTL_MS;
const DETAIL_LIMIT = NAVIGATION_CACHE_MAX_SERIES;

/** Publish each section independently; opening a partial snapshot never waits for extras. */
export function peekPreparedMangaDetail(id: string, maxAge = DETAIL_TTL): PreparedDetail | undefined {
  const entry = preparedDetails.get(id);
  if (!entry) return;
  if (Date.now() - entry.loadedAt >= DETAIL_TTL) { preparedDetails.delete(id); return; }
  if (Date.now() - entry.loadedAt >= maxAge) return;
  const comments = entry.owner === getAuthCacheKey() && entry.commentsAt !== undefined && Date.now() - entry.commentsAt < 60_000
    ? entry.data.comments : undefined;
  return { ...entry.data, comments };
}

function savePreparedDetail(id: string, data: PreparedDetail, commentsUpdated = false) {
  for (const [key, entry] of preparedDetails) {
    if (Date.now() - entry.loadedAt >= DETAIL_TTL) preparedDetails.delete(key);
  }
  const previous = preparedDetails.get(id);
  preparedDetails.set(id, {
    data, loadedAt: previous?.loadedAt ?? Date.now(),
    owner: commentsUpdated ? getAuthCacheKey() : previous?.owner ?? getAuthCacheKey(),
    commentsAt: commentsUpdated ? Date.now() : previous?.commentsAt,
  });
  while (preparedDetails.size > DETAIL_LIMIT) preparedDetails.delete(preparedDetails.keys().next().value!);
}

/** Hero/ranking cards prepare the selector and the opening chapter too. */
export function homeCoverPrefetchTarget(id: number | string): HomePrefetchTarget {
  const manga = peekKnownManga(String(id));
  const first = manga?.firstChapterId ?? manga?.capitulosRecientes.find(chapter => Number(chapter.numero) === 1 && chapter.id > 0)?.id;
  return {
    mangaId: String(id), seriesId: String(manga?.eroSeri || id),
    warmFirstChapter: true, chapterIds: first ? [String(first)] : [],
  };
}

export async function prepareHomeManga(target: HomePrefetchTarget, signal: AbortSignal, stage: HomePrefetchStage | 'all' = 'all'): Promise<void> {
  if (signal.aborted) return;
  if (stage === 'selector') {
    if (!target.seriesId) return;
    const chapters = peekHomeReaderChapters(target.seriesId) ?? await getChaptersBySeries(target.seriesId);
    if (!signal.aborted && chapters.length) homeReaderSession(target.mangaId, target.seriesId, chapters);
    return;
  }
  let detail = peekPreparedMangaDetail(target.mangaId);
  // Recent cards already identify the series: prepare its selector without
  // waiting for the detail response, and let foreground readers share this request.
  // Reader siblings lack fields the detail page needs (created_at), so the detail
  // always takes full rows from the shared, cached series request.
  const earlyChapters = !detail?.chapters && target.seriesId
    ? getChaptersBySeries(target.seriesId).then(chapters => {
      if (!signal.aborted) homeReaderSession(target.mangaId, target.seriesId!, chapters);
      return chapters;
    }) : undefined;
  // Warm the like alongside the detail without delaying the reader or chapter list.
  if (stage === 'detail' || stage === 'all') void Promise.resolve().then(() => getInteractions(target.mangaId)).catch(() => undefined);
  if (!detail) {
    const manga = await getMangaById(target.mangaId);
    if (!manga || signal.aborted) return;
    detail = { manga, chapters: peekSeriesChapters(manga.eroSeri || manga.id) };
    savePreparedDetail(target.mangaId, detail);
  }
  const seriesId = String(detail.manga.eroSeri || detail.manga.id);
  if (!detail.chapters) {
    const chapters = await (target.seriesId === seriesId && earlyChapters ? earlyChapters : getChaptersBySeries(seriesId));
    if (signal.aborted) return;
    detail = { ...detail, chapters };
    savePreparedDetail(target.mangaId, detail);
  }
  // Seed the selector as soon as its list arrives, before chapter content or comments.
  const session = homeReaderSession(target.mangaId, seriesId, detail.chapters!);
  if (!signal.aborted) void getChapterEngagement(detail.chapters!.map(chapter => chapter.id)).catch(() => undefined);
  if (stage === 'detail' || signal.aborted) return;
  if (stage === 'reader' || stage === 'all') {
    const pause = () => pauseHomeReaderSession(session);
    signal.addEventListener('abort', pause, { once: true });
    try {
      const first = target.warmFirstChapter
        ? [...detail.chapters!].sort((a, b) => a.chapter_number - b.chapter_number)[0]?.id : undefined;
      const ids = [...new Set([...target.chapterIds, ...(first ? [String(first)] : [])])];
      for (const id of ids) {
        if (signal.aborted) return;
        const chapter = detail.chapters!.find(item => String(item.id) === id);
        const released = chapter?.free_at && new Date(chapter.free_at).getTime() <= Date.now();
        if (!chapter || (chapter.is_paid && !released)) continue;
        try {
          const bundle = await session.load(id);
          if (signal.aborted) return;
          if (!bundle.error && !bundle.locked) await session.warmImages(bundle);
        } catch { if (signal.aborted) return; }
      }
    } finally { signal.removeEventListener('abort', pause); }
  }
  if (stage === 'reader' || signal.aborted) return;
  if (!detail.related) {
    const [related, catalog] = await Promise.all([getRelatedMangas(seriesId, 18), getUltimosCapitulos()]);
    if (signal.aborted) return;
    detail = { ...detail, related: buildMangaRecommendations(detail.manga, catalog, related) };
    savePreparedDetail(target.mangaId, detail);
  }
  await preloadImages([detail.manga.portada, ...detail.related!.slice(0, 2).map(item => item.portada)]);
  if (signal.aborted) return;
  if (!detail.comments) {
    const owner = getAuthCacheKey();
    const comments = await getMangaComments(String(detail.manga.id), undefined, signal);
    if (signal.aborted || owner !== getAuthCacheKey()) return;
    savePreparedDetail(target.mangaId, { ...detail, comments }, true);
  }
}
