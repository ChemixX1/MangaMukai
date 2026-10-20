import { MANGAMUKAI_API, WORDPRESS_POSTS_API } from '../config/api';
import { getAuthCacheKey, getStoredToken } from './authService';

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
  private imageJobs = new Map<AbortController, string>();
  private series = new Map<string, ReaderSibling[]>();
  private seriesJobs = new Set<AbortController>();
  private warmed = new Map<string, number>();
  private generation = 0;
  private disposed = false;
  private focused = '';
  private schedule: ReturnType<typeof setTimeout> | null = null;

  peek(id: string) { return this.cache.get(id); }
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
  }
  async load(id: string): Promise<ReaderBundle> {
    if (this.disposed) throw cancelled();
    const cached = this.cache.get(id);
    if (cached) return cached;
    const existing = this.pending.get(id);
    if (existing && !existing.controller.signal.aborted) return existing.promise;
    const controller = new AbortController();
    const token = getStoredToken();
    const known = this.series.get(this.mangaId)?.find(chapter => String(chapter.id) === id);
    const metadataRequest = known?.title
      ? Promise.resolve({ title: { rendered: known.title }, ero_seri: this.mangaId, ero_chapter: known.chapter_number })
      : fetch(`${WORDPRESS_POSTS_API}/${id}?_fields=id,title,ero_seri,ero_chapter`, { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error('Capítulo no encontrado.'); return response.json(); });
    const promise = Promise.all([
      metadataRequest,
      fetch(`${MANGAMUKAI_API}/chapters/content?id=${id}`, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(response => response.json()),
    ]).then(([metadata, content]) => {
      if (this.disposed || controller.signal.aborted) throw cancelled();
      const images = content.success && Array.isArray(content.images) ? content.images.filter((url: unknown): url is string => typeof url === 'string') : [];
      const locked = !content.success && !!content.locked;
      const bundle: ReaderBundle = {
        id,
        title: metadata.title?.rendered || `Capítulo ${metadata.ero_chapter}`,
        mangaId: String(metadata.ero_seri || ''),
        number: Number(metadata.ero_chapter) || 0,
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
    const controller = new AbortController(); this.seriesJobs.add(controller);
    try {
      const response = await fetch(`${MANGAMUKAI_API}/series/${mangaId}/chapters`, { signal: controller.signal });
      const data = await response.json();
      if (this.disposed || !data.success || !Array.isArray(data.chapters)) return [];
      const chapters = (data.chapters as ReaderSibling[]).sort((a,b) => a.chapter_number - b.chapter_number);
      this.series.set(mangaId, chapters); return chapters;
    } finally { this.seriesJobs.delete(controller); }
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
    }
    const generation = this.generation;
    this.schedule = setTimeout(() => { void (async () => {
      for (const chapter of order) {
        if (generation !== this.generation || this.disposed || document.hidden) return;
        const id = String(chapter.id);

        const released = !!chapter.free_at && new Date(chapter.free_at).getTime() <= Date.now();
        if (id === this.focused || (chapter.is_paid && !released && !unlocked.has(id))) continue;
        const cached = this.peek(id);
        const target = cached ? (currentId ? cached.images.length : Math.min(READER_IMAGE_BATCH, cached.images.length)) : Infinity;
        if ((this.warmed.get(id) ?? -1) >= target) continue;
        try { const bundle = await this.load(id); if (generation !== this.generation) return; if (!bundle.error && !bundle.locked) await this.warmImages(bundle, !!currentId); }
        catch { if (generation !== this.generation || this.disposed) return; }
      }
    })(); }, 120);
  }
  dispose() {
    this.disposed = true; this.pause();
    for (const job of this.pending.values()) job.controller.abort();
    for (const controller of this.imageJobs.keys()) controller.abort();
    for (const controller of this.seriesJobs) controller.abort();
    this.cache.clear(); this.series.clear(); this.warmed.clear();
  }
}

let shared: ReaderPrefetchSession | null = null;
let owner: string | null = null;

function ensureOwner() {
  const identity = getAuthCacheKey();
  if (owner !== identity) { clearReaderPrefetch(); owner = identity; }
}

export function syncReaderPrefetchAuth() { ensureOwner(); }

export function clearReaderPrefetch() {
  shared?.dispose();
  shared = null;
}

export function mangaReaderSession(routeId: string, mangaId: string, chapters: ReaderSibling[]) {
  ensureOwner();
  if (shared && shared.mangaId !== mangaId) clearReaderPrefetch();
  shared ??= new ReaderPrefetchSession();
  shared.seed(mangaId, chapters, routeId);
  shared.focus('');
  return shared;
}

export function chapterReaderSession(id: string) {
  ensureOwner();
  if (shared && !shared.owns(id)) clearReaderPrefetch();
  shared ??= new ReaderPrefetchSession();
  shared.focus(id);
  return shared;
}

export function syncReaderPrefetchRoute(pathname: string) {
  ensureOwner();
  if (!shared) return;
  const chapter = /^\/read\/([^/]+)\/?$/.exec(pathname)?.[1];
  if (chapter && shared.owns(chapter)) { shared.focus(chapter); return; }
  const manga = /^\/manga\/([^/]+)\/?$/.exec(pathname)?.[1];
  if (manga && (shared.mangaId === manga || shared.detailRoutes.has(manga))) { shared.pause(); return; }
  clearReaderPrefetch();
}
