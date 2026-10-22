import { MANGAMUKAI_API, WORDPRESS_POSTS_API } from '../config/api';
import { getAuthCacheKey, getStoredToken } from './authService';
import { peekChapterMetadata, type ChapterMetadata } from './chapterMetadata';
import { getChaptersBySeries } from './mangaService';

export interface ReaderBundle {
  id: string;
  title: string;
  mangaId: string;
  number: number;
  images: string[];
  error: string | null;

  locked: boolean;
  price: number;
  requiresLogin: boolean;
}
export interface ReaderSibling {
  id: string | number;
  chapter_number: number;
  title?: string;
  is_paid: boolean;
  price_coins: number;
  free_at?: string | null;
  cover_url?: string | null;
}
const cancelled = () => new DOMException('Reader session stopped', 'AbortError');
export const READER_IMAGE_BATCH = 5;

export class ReaderPrefetchSession {
  mangaId = '';
  readonly detailRoutes = new Set<string>();
  private cache = new Map<string, ReaderBundle>();
  private pending = new Map<string, { promise: Promise<ReaderBundle>; controller: AbortController }>();
  private metadataCache = new Map<string, ChapterMetadata>();
  private metadataJobs = new Map<string, { promise: Promise<ChapterMetadata>; controller: AbortController }>();
  private imageJobs = new Map<AbortController, string>();
  private series = new Map<string, ReaderSibling[]>();
  private seriesJobs = new Map<string, Promise<ReaderSibling[]>>();
  private warmed = new Map<string, number>();
  private generation = 0;
  private disposed = false;
  private focused = '';
  private schedule: ReturnType<typeof setTimeout> | null = null;

  peek(id: string) { return this.cache.get(id); }
  peekMetadata(id: string): ChapterMetadata | undefined {
    const bundle = this.cache.get(id);
    if (bundle) return bundle;
    const chapter = this.peekSiblings().find(item => String(item.id) === id);
    if (chapter) return { id, mangaId: this.mangaId, title: chapter.title || peekChapterMetadata(id)?.title || `Capítulo ${chapter.chapter_number}`, number: chapter.chapter_number };
    return this.metadataCache.get(id) || peekChapterMetadata(id);
  }
  peekSiblings() { return this.series.get(this.mangaId) || []; }
  seedMetadata(metadata: ChapterMetadata) {
    if (this.disposed || (this.mangaId && metadata.mangaId !== this.mangaId)) return;
    this.mangaId = metadata.mangaId;
    this.metadataCache.set(metadata.id, metadata);
  }
  owns(id: string) { return this.focused === id || this.cache.has(id) || [...this.series.values()].some(chapters => chapters.some(chapter => String(chapter.id) === id)); }
  seed(mangaId: string, chapters: ReaderSibling[], routeId = mangaId) {
    this.mangaId = mangaId;
    this.detailRoutes.add(routeId);
    this.series.set(mangaId, [...chapters].sort((a, b) => a.chapter_number - b.chapter_number));
  }
  invalidate(id: string) {
    this.pending.get(id)?.controller.abort();
    for (const [controller, chapter] of this.imageJobs) if (chapter === id) controller.abort();
    this.cache.delete(id);
    this.warmed.delete(id);
  }
  focus(id: string) {
    this.focused = id;
    this.pause();
    for (const [key, job] of this.pending) if (key !== id) job.controller.abort();
  }
  pause() {
    this.generation++;
    if (this.schedule) clearTimeout(this.schedule);

    for (const controller of this.imageJobs.keys()) controller.abort();
    for (const [id, job] of this.pending) if (id !== this.focused) job.controller.abort();
    for (const [id, job] of this.metadataJobs) if (id !== this.focused) job.controller.abort();
  }
  async metadata(id: string): Promise<ChapterMetadata> {
    if (this.disposed) throw cancelled();
    const known = this.peekMetadata(id);
    if (known) {
      if (this.mangaId && known.mangaId !== this.mangaId) throw cancelled();
      this.mangaId = known.mangaId;
      return known;
    }
    const existing = this.metadataJobs.get(id);
    if (existing && !existing.controller.signal.aborted) return existing.promise;
    const controller = new AbortController();
    const promise = fetch(`${WORDPRESS_POSTS_API}/${id}?_fields=id,title,ero_seri,ero_chapter`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Capítulo no encontrado.');
        const data = await response.json();
        if (this.disposed || controller.signal.aborted) throw cancelled();
        const metadata = { id, mangaId: String(data.ero_seri || ''), title: data.title?.rendered || `Capítulo ${data.ero_chapter}`, number: Number(data.ero_chapter) || 0 };
        if (this.mangaId && metadata.mangaId !== this.mangaId) throw cancelled();
        this.mangaId = metadata.mangaId;
        this.metadataCache.set(id, metadata);
        if (this.metadataCache.size > 48) this.metadataCache.delete(this.metadataCache.keys().next().value!);
        return metadata;
      }).finally(() => { if (this.metadataJobs.get(id)?.controller === controller) this.metadataJobs.delete(id); });
    this.metadataJobs.set(id, { promise, controller });
    return promise;
  }
  async load(id: string): Promise<ReaderBundle> {
    if (this.disposed) throw cancelled();
    const cached = this.cache.get(id);
    if (cached) return cached;
    const existing = this.pending.get(id);
    if (existing && !existing.controller.signal.aborted) return existing.promise;
    const controller = new AbortController();
    const token = getStoredToken();
    const promise = Promise.all([
      this.metadata(id),
      fetch(`${MANGAMUKAI_API}/chapters/content?id=${id}`, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(response => response.json()),
    ]).then(([metadata, content]) => {
      if (this.disposed || controller.signal.aborted) throw cancelled();
      const images = content.success && Array.isArray(content.images) ? content.images.filter((url: unknown): url is string => typeof url === 'string') : [];
      const locked = !content.success && !!content.locked;
      const bundle: ReaderBundle = {
        id,
        title: metadata.title,
        mangaId: metadata.mangaId,
        number: metadata.number,
        images,
        locked,
        price: Number(content.price || 0),
        requiresLogin: locked && !token,
        error: images.length || locked ? null : content.message || 'Este capítulo no tiene páginas disponibles.',
      };
      if (this.mangaId && bundle.mangaId !== this.mangaId) throw cancelled();
      this.mangaId = bundle.mangaId;
      this.cache.set(id, bundle);

      if (this.cache.size > 48) for (const key of this.cache.keys()) { if (key !== this.focused && key !== id) { this.cache.delete(key); break; } }
      return bundle;
    }).finally(() => { if (this.pending.get(id)?.controller === controller) this.pending.delete(id); });
    this.pending.set(id, { promise, controller });
    return promise;
  }
  async siblings(mangaId: string): Promise<ReaderSibling[]> {
    if (this.disposed) throw cancelled();
    const cached = this.series.get(mangaId); if (cached) return cached;
    const existing = this.seriesJobs.get(mangaId); if (existing) return existing;
    // Share the public request with home/detail, including a prefetch still in flight.
    const promise = getChaptersBySeries(mangaId).then(data => {
      if (this.disposed) throw cancelled();
      const chapters = [...data].sort((a, b) => a.chapter_number - b.chapter_number);
      if (chapters.length) this.series.set(mangaId, chapters);
      return chapters;
    }).finally(() => this.seriesJobs.delete(mangaId));
    this.seriesJobs.set(mangaId, promise);
    return promise;
  }
  async warmImages(bundle: ReaderBundle, full = false) {
    if (this.disposed) throw cancelled();
    const controller = new AbortController(); this.imageJobs.set(controller, bundle.id);
    const target = full ? bundle.images.length : Math.min(READER_IMAGE_BATCH, bundle.images.length);
    const images = bundle.images.slice(this.warmed.get(bundle.id) || 0, target);
    let successful = true;
    let cursor = 0;
    const worker = async () => {
      while (cursor < images.length && !controller.signal.aborted) {
        const url = images[cursor++];
        await new Promise<void>((resolve, reject) => {
          const image = new Image();
          const cleanup = () => { clearTimeout(timer); image.onload = null; image.onerror = null; controller.signal.removeEventListener('abort', abort); };
          const done = () => { cleanup(); resolve(); };
          const failed = () => { successful = false; done(); };
          const abort = () => { cleanup(); image.removeAttribute('src'); reject(cancelled()); };
          const timer = setTimeout(() => { image.removeAttribute('src'); failed(); }, 10000);
          image.onload = done; image.onerror = failed;
          image.fetchPriority = 'low';
          controller.signal.addEventListener('abort', abort, { once: true });
          if (controller.signal.aborted) { abort(); return; }
          image.src = url;
          if (image.complete) { if (image.naturalWidth > 0) done(); else failed(); }
        });
      }
    };
    try { await Promise.all([worker(), worker()]); if (!controller.signal.aborted && successful) this.warmed.set(bundle.id, Math.max(target, this.warmed.get(bundle.id) || 0)); }
    finally { this.imageJobs.delete(controller); }
  }
  warmAround(chapters: ReaderSibling[], currentId: string, unlocked: Set<string>) {
    this.pause();
    if (this.disposed || document.hidden) return;
    const index = chapters.findIndex(chapter => String(chapter.id) === currentId);
    const order: ReaderSibling[] = [];
    if (index < 0) order.push(...chapters);
    if (index >= 0) {

      if (chapters[index+1]) order.push(chapters[index+1]);
      if (chapters[index-1]) order.push(chapters[index-1]);
      order.push(...chapters.slice(index + 2), ...chapters.slice(0, Math.max(0, index - 1)).reverse());
    }
    const generation = this.generation;
    this.schedule = setTimeout(() => { void (async () => {
      for (const chapter of order) {
        if (generation !== this.generation || this.disposed || document.hidden) return;
        const id = String(chapter.id);

        const released = !!chapter.free_at && new Date(chapter.free_at).getTime() <= Date.now();
        if (id === this.focused || (chapter.is_paid && !released && !unlocked.has(id))) continue;
        const cached = this.peek(id);
        // Browser HTTP cache owns the image bytes; retain only bounded URL metadata here.
        if (currentId && this.warmed.get(id) === Infinity) continue;
        const target = cached ? (currentId ? cached.images.length : Math.min(READER_IMAGE_BATCH, cached.images.length)) : Infinity;
        if ((this.warmed.get(id) ?? -1) >= target) continue;
        try {
          const bundle = await this.load(id);
          if (generation !== this.generation) return;
          if (!bundle.error && !bundle.locked) {
            await this.warmImages(bundle, !!currentId);
            if (currentId && (this.warmed.get(id) ?? 0) >= bundle.images.length) this.warmed.set(id, Infinity);
          }
        }
        catch { if (generation !== this.generation || this.disposed) return; }
      }
    })(); }, currentId ? 0 : 120);
  }
  dispose() {
    this.disposed = true; this.pause();
    for (const job of this.pending.values()) job.controller.abort();
    for (const controller of this.imageJobs.keys()) controller.abort();
    for (const job of this.metadataJobs.values()) job.controller.abort();
    this.cache.clear(); this.metadataCache.clear(); this.series.clear(); this.warmed.clear();
  }
}

let shared: ReaderPrefetchSession | null = null;
let owner: string | null = null;
const homeSessions = new Map<string, { session: ReaderPrefetchSession; expiresAt: number }>();
const HOME_SESSION_LIMIT = 128;
const HOME_SESSION_TTL = 5 * 60 * 1000;

function pruneHomeSessions() {
  for (const [key, entry] of homeSessions) {
    if (entry.expiresAt <= Date.now()) { entry.session.dispose(); homeSessions.delete(key); }
  }
}

/** Park home chapters separately so preparing one manga never discards another. */
export function homeReaderSession(routeId: string, mangaId: string, chapters: ReaderSibling[]) {
  ensureOwner();
  pruneHomeSessions();
  const session = homeSessions.get(mangaId)?.session ?? new ReaderPrefetchSession();
  session.seed(mangaId, chapters, routeId);
  homeSessions.delete(mangaId);
  homeSessions.set(mangaId, { session, expiresAt: Date.now() + HOME_SESSION_TTL });
  while (homeSessions.size > HOME_SESSION_LIMIT) {
    const key = homeSessions.keys().next().value!;
    homeSessions.get(key)!.session.dispose();
    homeSessions.delete(key);
  }
  return session;
}

export function pauseHomeReaderSession(session: ReaderPrefetchSession) {
  // Navigation may already have promoted this session into the active reader.
  if ([...homeSessions.values()].some(entry => entry.session === session)) session.pause();
}

/** A selector prepared separately must survive eviction from the smaller HTTP-data cache. */
export function peekHomeReaderChapters(mangaId: string, maxAge = 60_000) {
  if (owner !== getAuthCacheKey()) return;
  const entry = homeSessions.get(mangaId);
  if (!entry || Date.now() - (entry.expiresAt - HOME_SESSION_TTL) >= maxAge) return;
  return entry.session.peekSiblings();
}

function activateHomeSession(session: ReaderPrefetchSession) {
  for (const [key, entry] of homeSessions) if (entry.session === session) homeSessions.delete(key);
  clearReaderPrefetch();
  shared = session;
}

// Metadata remains available while chapter images load or are evicted.
export function peekReaderSession(id: string) {
  if (owner !== getAuthCacheKey()) return null;
  if (shared?.owns(id)) return shared;
  return [...homeSessions.values()].find(entry => entry.expiresAt > Date.now() && entry.session.owns(id))?.session ?? null;
}

function ensureOwner() {
  const identity = getAuthCacheKey();
  if (owner !== identity) { clearReaderPrefetch(); owner = identity; }
}

export function syncReaderPrefetchAuth() { ensureOwner(); }

export function clearReaderPrefetch() {
  shared?.dispose();
  shared = null;
  for (const entry of homeSessions.values()) entry.session.dispose();
  homeSessions.clear();
}

export function mangaReaderSession(routeId: string, mangaId: string, chapters: ReaderSibling[]) {
  ensureOwner();
  pruneHomeSessions();
  const prepared = homeSessions.get(mangaId)?.session;
  if (prepared) activateHomeSession(prepared);
  if (shared && shared.mangaId !== mangaId) clearReaderPrefetch();
  shared ??= new ReaderPrefetchSession();
  shared.seed(mangaId, chapters, routeId);
  shared.focus('');
  return shared;
}

export function chapterReaderSession(id: string) {
  ensureOwner();
  pruneHomeSessions();
  const prepared = peekReaderSession(id);
  if (prepared && prepared !== shared) activateHomeSession(prepared);
  if (shared && !shared.owns(id)) clearReaderPrefetch();
  shared ??= new ReaderPrefetchSession();
  shared.focus(id);
  return shared;
}

export function syncReaderPrefetchRoute(pathname: string) {
  ensureOwner();
  pruneHomeSessions();
  if (pathname === '/') { shared?.dispose(); shared = null; return; }
  const chapter = /^\/read\/([^/]+)\/?$/.exec(pathname)?.[1];
  if (chapter && peekReaderSession(chapter)) { chapterReaderSession(chapter); return; }
  const manga = /^\/manga\/([^/]+)\/?$/.exec(pathname)?.[1];
  const prepared = manga && [...homeSessions.values()].find(({ session }) => session.mangaId === manga || session.detailRoutes.has(manga));
  if (prepared) activateHomeSession(prepared.session);
  if (!shared) { clearReaderPrefetch(); return; }
  if (manga && (shared.mangaId === manga || shared.detailRoutes.has(manga))) { shared.pause(); return; }
  clearReaderPrefetch();
}
