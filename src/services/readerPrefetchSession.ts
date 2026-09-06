import { MANGAMUKAI_API, WORDPRESS_POSTS_API } from '../config/api';
import { getStoredToken } from './authService';

export interface ReaderBundle {
  id: string;
  title: string;
  mangaId: string;
  number: number;
  images: string[];
  error: string | null;
}
export interface ReaderSibling {
  id: string | number;
  chapter_number: number;
  title?: string;
  is_paid: boolean;
  price_coins: number;
}
const cancelled = () => new DOMException('Reader session stopped', 'AbortError');

/** One reader visit owns all preloads. Nothing survives leaving the reader. */
export class ReaderPrefetchSession {
  private cache = new Map<string, ReaderBundle>();
  private pending = new Map<string, { promise: Promise<ReaderBundle>; controller: AbortController }>();
  private imageJobs = new Map<AbortController, string>();
  private series = new Map<string, ReaderSibling[]>();
  private seriesJobs = new Set<AbortController>();
  private warmed = new Set<string>();
  private generation = 0;
  private disposed = false;
  private focused = '';
  private schedule: ReturnType<typeof setTimeout> | null = null;

  peek(id: string) { return this.cache.get(id); }
  invalidate(id: string) { this.cache.delete(id); this.warmed.delete(id); }
  focus(id: string) {
    this.focused = id;
    this.pause();
    for (const [key, job] of this.pending) if (key !== id) job.controller.abort();
  }
  pause() {
    this.generation++;
    if (this.schedule) clearTimeout(this.schedule);
    for (const [controller, id] of this.imageJobs) if (id !== this.focused) controller.abort();
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
    const promise = Promise.all([
      fetch(`${WORDPRESS_POSTS_API}/${id}?_fields=id,title,ero_seri,ero_chapter`, { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error('Capítulo no encontrado.'); return response.json(); }),
      fetch(`${MANGAMUKAI_API}/chapters/content?id=${id}`, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(response => response.json()),
    ]).then(([metadata, content]) => {
      if (this.disposed || controller.signal.aborted) throw cancelled();
      const images = content.success && Array.isArray(content.images) ? content.images.filter((url: unknown): url is string => typeof url === 'string') : [];
      const bundle: ReaderBundle = { id, title: metadata.title?.rendered || `Capítulo ${metadata.ero_chapter}`, mangaId: String(metadata.ero_seri || ''), number: Number(metadata.ero_chapter) || 0, images, error: images.length ? null : content.message || 'Este capítulo no tiene páginas disponibles.' };
      this.cache.set(id, bundle);
      // Keep metadata bounded; already downloaded images remain in the browser's HTTP cache.
      if (this.cache.size > 48) for (const key of this.cache.keys()) { if (key !== this.focused && key !== id) { this.cache.delete(key); break; } }
      return bundle;
    }).finally(() => { if (this.pending.get(id)?.controller === controller) this.pending.delete(id); });
    this.pending.set(id, { promise, controller });
    return promise;
  }
  async siblings(mangaId: string): Promise<ReaderSibling[]> {
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
  async warmImages(bundle: ReaderBundle, firstOnly = false) {
    if (this.disposed) throw cancelled();
    const controller = new AbortController(); this.imageJobs.set(controller, bundle.id);
    const images = firstOnly ? bundle.images.slice(0,2) : bundle.images;
    let cursor = 0;
    const worker = async () => {
      while (cursor < images.length && !controller.signal.aborted) {
        const url = images[cursor++];
        await new Promise<void>((resolve, reject) => {
          const image = new Image();
          const cleanup = () => { clearTimeout(timer); image.onload = null; image.onerror = null; controller.signal.removeEventListener('abort', abort); };
          const done = () => { cleanup(); resolve(); };
          const abort = () => { cleanup(); image.removeAttribute('src'); reject(cancelled()); };
          const timer = setTimeout(() => { image.removeAttribute('src'); done(); }, 10000);
          image.onload = done; image.onerror = done;
          controller.signal.addEventListener('abort', abort, { once: true });
          if (controller.signal.aborted) { abort(); return; }
          image.src = url;
          if (image.complete) done();
        });
      }
    };
    try { await Promise.all([worker(), worker()]); if (!firstOnly && !controller.signal.aborted) this.warmed.add(bundle.id); }
    finally { this.imageJobs.delete(controller); }
  }
  warmAround(chapters: ReaderSibling[], currentId: string, unlocked: Set<string>) {
    this.pause();
    if (this.disposed || document.hidden) return;
    const index = chapters.findIndex(chapter => String(chapter.id) === currentId);
    if (index < 0) return;
    const order: ReaderSibling[] = [];
    for (let distance=1; distance<chapters.length; distance++) {
      if (chapters[index- distance]) order.push(chapters[index-distance]);
      if (chapters[index+distance]) order.push(chapters[index+distance]);
    }
    const generation = this.generation;
    this.schedule = setTimeout(() => { void (async () => {
      for (const chapter of order) {
        if (generation !== this.generation || this.disposed || document.hidden) return;
        const id = String(chapter.id);
        // Preloading never buys a chapter and never bypasses its server-side access check.
        if (this.warmed.has(id) || (chapter.is_paid && !unlocked.has(id))) continue;
        try { const bundle = await this.load(id); if (generation !== this.generation) return; if (!bundle.error) await this.warmImages(bundle); }
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
