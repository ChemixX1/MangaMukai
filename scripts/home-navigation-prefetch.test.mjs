import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export * from './src/services/homeNavigationPrefetch';
    export * from './src/services/readerPrefetchSession';
    export { createHomeNavigationQueue } from './src/utils/homeNavigationQueue';
    export { getMangaById, getChaptersBySeries, getRelatedMangas } from './src/services/mangaService';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' },
});
let run = 0;
async function setup(t, { stallContent = false, stallChapters = false, stallComments = false, stallDetail = false } = {}) {
  const previous = Object.fromEntries(['fetch', 'Image', 'window', 'document', 'localStorage', 'sessionStorage'].map(key => [key, globalThis[key]]));
  const stored = new Map();
  const storage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  globalThis.localStorage = globalThis.sessionStorage = storage;
  globalThis.window = { location: { hostname: 'localhost', origin: 'http://localhost' }, sessionStorage: storage, setTimeout, clearTimeout };
  globalThis.document = { hidden: false };
  const images = [];
  globalThis.Image = class {
    complete = false;
    naturalWidth = 800;
    decode() { return Promise.resolve(); }
    set src(url) { this.url = url; images.push(this); queueMicrotask(() => { this.complete = true; this.onload?.(); }); }
    removeAttribute() { this.aborted = true; }
  };
  const requests = [];
  const startedContent = Promise.withResolvers();
  const startedChapters = Promise.withResolvers();
  const releaseChapters = Promise.withResolvers();
  const startedComments = Promise.withResolvers();
  const releaseComments = Promise.withResolvers();
  const releaseDetail = Promise.withResolvers();
  const manga = id => ({ id, titulo: `Manga ${id}`, portada: `https://images.test/cover/${id}.webp`, fecha: '2026-10-21', genres: [], esGratis: true, tipo: 'Manga' });
  const chapters = id => [1, 2, 3].map(number => ({
    id: id * 10 + number, chapter_number: number, title: `Capítulo ${number}`,
    is_paid: number > 1, price_coins: number > 1 ? 20 : 0,
    free_at: number === 3 ? '2020-01-01T00:00:00Z' : null,
  }));
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    assert.ok(!options?.method || options.method === 'GET', 'speculation cannot mutate views, progress or purchases');
    let data;
    if (url.includes('/chapters/content')) {
      startedContent.resolve();
      if (stallContent) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
      const id = new URL(url, 'http://localhost').searchParams.get('id');
      data = { success: true, images: Array.from({ length: 22 }, (_, i) => `https://images.test/chapter/${id}/${i}.webp`) };
    } else if (url.includes('/series/')) {
      startedChapters.resolve();
      if (stallChapters) await releaseChapters.promise;
      data = { success: true, chapters: chapters(Number(/\/series\/(\d+)/.exec(url)[1])) };
    } else if (url.includes('/manga/')) {
      if (stallDetail) await releaseDetail.promise;
      data = { success: true, ...manga(Number(/\/manga\/(\d+)/.exec(url)[1])) };
    } else if (url.includes('/related/') || url.endsWith('/catalog')) {
      data = { success: true, mangas: [manga(900), manga(901)] };
    } else if (url.includes('/interactions?')) {
      data = { success: true, online_readers: 2, bookmarks: [], likes: [], history: [], manga_likes: 12 };
    } else if (url.includes('/chapters/comment-counts?')) {
      data = { counts: { '1001': 2 }, engagement: { '1001': { reactions: { like: 7 }, my_reaction: '' } } };
    } else if (url.includes('/comments?')) {
      startedComments.resolve();
      if (stallComments) await releaseComments.promise;
      data = { comments: [{ id: 1, content: 'Comentario', is_liked_by_user: true }] };
    } else assert.fail(`Unexpected request: ${url}`);
    return { ok: true, json: async () => data };
  };
  const source = `${bundle.outputFiles[0].text}\n// test ${++run}`;
  const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  t.after(() => { api.clearReaderPrefetch(); Object.assign(globalThis, previous); });
  return { api, requests, images, startedContent: startedContent.promise, startedChapters: startedChapters.promise, releaseChapters: releaseChapters.resolve, startedComments: startedComments.promise, releaseComments: releaseComments.resolve, releaseDetail: releaseDetail.resolve, stored };
}

test('recent cards prepare the reader list first even when the detail response is stalled', async t => {
  const { api, requests, releaseDetail } = await setup(t, { stallDetail: true });
  const pending = api.prepareHomeManga({ mangaId: '100', seriesId: '100', chapterIds: [] }, new AbortController().signal, 'detail');
  await new Promise(resolve => setImmediate(resolve));
  assert.match(requests[0].url, /\/series\/100\/chapters/);
  assert.equal(api.peekReaderSession('1001').peekSiblings().length, 3);
  assert.equal(api.peekPreparedMangaDetail('100'), undefined);
  assert.equal(requests.length, 3);
  releaseDetail(); await pending;
  assert.equal(api.peekPreparedMangaDetail('100').chapters.length, 3);
  assert.equal(requests.length, 4, 'detail shares the list and warms likes and chapter engagement');
});

test('home prepares detail sections and only five strips of the requested accessible recent chapters', async t => {
  const { api, requests, images } = await setup(t);
  await api.prepareHomeManga({ mangaId: '100', chapterIds: ['1001', '1002', '1003', '9999'] }, new AbortController().signal);
  const detail = api.peekPreparedMangaDetail('100');
  assert.equal(detail.manga.titulo, 'Manga 100');
  assert.equal(detail.chapters.length, 3);
  assert.equal(detail.related.length, 2);
  assert.equal(detail.comments[0].content, 'Comentario');
  const contents = requests.filter(({ url }) => url.includes('/chapters/content'));
  assert.deepEqual(contents.map(({ url }) => new URL(url, 'http://localhost').searchParams.get('id')), ['1001', '1003']);
  assert.equal(images.filter(image => image.url.includes('/chapter/')).length, 10);
  const before = requests.length;
  await api.getMangaById('100');
  await api.getChaptersBySeries('100');
  await api.getRelatedMangas('100', 18);
  api.syncReaderPrefetchRoute('/read/1001');
  const reader = api.chapterReaderSession('1001');
  assert.equal(reader.peek('1001').images.length, 22);
  assert.equal((await reader.siblings('100')).length, 3);
  await reader.load('1001');
  assert.equal(requests.length, before, 'detail and reader reuse the same requests');
});

test('cancelled home work starts nothing, and changing the selection aborts chapter requests', async t => {
  const { api, requests, images, startedContent } = await setup(t, { stallContent: true });
  const cancelled = new AbortController();
  cancelled.abort();
  await api.prepareHomeManga({ mangaId: '100', chapterIds: ['1001'] }, cancelled.signal);
  assert.equal(requests.length, 0);
  const controller = new AbortController();
  const pending = api.prepareHomeManga({ mangaId: '100', chapterIds: ['1001'] }, controller.signal);
  await startedContent;
  controller.abort();
  await pending;
  assert.equal(images.length, 0);
  assert.equal(api.peekReaderSession('1001').peek('1001'), undefined);
});

test('prepared comments are short-lived and scoped to the account; public snapshots expire too', async t => {
  const { api, stored } = await setup(t);
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  stored.set('mm_token', 'first');
  await api.prepareHomeManga({ mangaId: '100', chapterIds: [] }, new AbortController().signal);
  assert.equal(api.peekPreparedMangaDetail('100').comments.length, 1);
  stored.set('mm_token', 'second');
  assert.equal(api.peekPreparedMangaDetail('100').comments, undefined);
  stored.set('mm_token', 'first');
  t.mock.timers.tick(60_000);
  assert.equal(api.peekPreparedMangaDetail('100', 60_000), undefined, 'foreground revalidates public data after one minute');
  assert.equal(api.peekPreparedMangaDetail('100').comments, undefined);
  assert.equal(api.peekPreparedMangaDetail('100').manga.id, 100);
  t.mock.timers.tick(60_000);
  assert.equal(api.peekPreparedMangaDetail('100'), undefined);
});

test('synopsis is published before the list, and the reader selector is ready before content or extras', async t => {
  const { api, requests, images, startedChapters, releaseChapters } = await setup(t, { stallChapters: true });
  const target = { mangaId: '100', chapterIds: ['1001'] };
  const signal = new AbortController().signal;
  const pending = api.prepareHomeManga(target, signal, 'detail');
  await startedChapters;
  assert.equal(api.peekPreparedMangaDetail('100').manga.titulo, 'Manga 100');
  assert.equal(api.peekPreparedMangaDetail('100').chapters, undefined);
  assert.equal(requests.length, 3, 'the manga, its chapter list and its likes load independently');
  releaseChapters();
  await pending;
  const partial = api.peekPreparedMangaDetail('100');
  assert.equal(partial.chapters.length, 3);
  assert.equal(partial.related, undefined);
  assert.equal(partial.comments, undefined);
  assert.equal(api.peekReaderSession('1001').peekSiblings().length, 3);
  assert.equal(images.length, 0);
  await api.prepareHomeManga(target, signal, 'reader');
  assert.equal(requests.length, 5, 'reader reuses the manga/list alongside likes and chapter engagement prefetch');
  assert.equal(images.length, 5);
  assert.equal(api.peekReaderSession('1001').peek('1001').images.length, 22);
  assert.equal(api.peekPreparedMangaDetail('100').comments, undefined);
  await api.prepareHomeManga(target, signal, 'extras');
  assert.equal(api.peekPreparedMangaDetail('100').comments.length, 1);
  assert.match(requests.at(-1).url, /\/comments\?/);
  const count = requests.length;
  await api.prepareHomeManga(target, signal, 'detail');
  await api.prepareHomeManga(target, signal, 'reader');
  await api.prepareHomeManga(target, signal, 'extras');
  assert.equal(requests.length, count, 'all stages reuse completed work');
});

test('slow comments cannot hold the synopsis, selector, recommendations or chapter images', async t => {
  const { api, images, startedComments, releaseComments } = await setup(t, { stallComments: true });
  const pending = api.prepareHomeManga({ mangaId: '100', chapterIds: ['1001'] }, new AbortController().signal);
  await startedComments;
  const partial = api.peekPreparedMangaDetail('100');
  assert.equal(partial.manga.id, 100);
  assert.equal(partial.chapters.length, 3);
  assert.equal(partial.related.length, 2);
  assert.equal(partial.comments, undefined);
  assert.equal(api.peekReaderSession('1001').peekSiblings().length, 3);
  assert.equal(images.filter(image => image.url.includes('/chapter/')).length, 5);
  releaseComments();
  await pending;
  assert.equal(api.peekPreparedMangaDetail('100').comments.length, 1);
});


test('hero cards without chapter metadata prepare the selector then the actual opening chapter', async t => {
  const { api, requests } = await setup(t);
  const target = api.homeCoverPrefetchTarget('100');
  assert.equal(target.prioritizeChapters, undefined);
  assert.equal(target.warmFirstChapter, true);
  const signal = new AbortController().signal;
  await api.prepareHomeManga(target, signal, 'selector');
  assert.equal(requests.length, 1);
  await api.prepareHomeManga(target, signal, 'detail');
  await api.prepareHomeManga(target, signal, 'reader');
  const content = requests.filter(({ url }) => url.includes('/chapters/content'));
  assert.equal(content.length, 1);
  assert.match(content[0].url, /id=1001/);
  assert.equal(requests.filter(({ url }) => url.includes('/series/')).length, 1);
});


test('prepared detail snapshots retain at most 24 series', async t => {
  const { api } = await setup(t);
  for (let id = 100; id < 125; id++) {
    await api.prepareHomeManga({ mangaId: String(id), chapterIds: [] }, new AbortController().signal, 'detail');
  }
  assert.equal(api.peekPreparedMangaDetail('100'), undefined);
  assert.ok(api.peekPreparedMangaDetail('101'));
  assert.ok(api.peekPreparedMangaDetail('124'));
});

test('the home pipeline stays inside its cache budget without refetching lists between stages', async t => {
  const { api, requests } = await setup(t);
  const jobs = [];
  const queue = api.createHomeNavigationQueue(task => {
    const job = { task, cancelled: false };
    jobs.push(job);
    return () => { job.cancelled = true; };
  }, api.prepareHomeManga);
  const targets = Array.from({ length: 25 }, (_, index) => {
    const id = index + 100;
    return { mangaId: String(id), seriesId: String(id), chapterIds: [String(id * 10 + 1)] };
  });
  queue.setGroup('latest', { current: targets, next: [], visible: true });
  queue.setEnabled(true);
  while (jobs.length) {
    const job = jobs.shift();
    if (!job.cancelled) await job.task();
  }
  queue.stop();
  assert.equal(requests.filter(({ url }) => url.includes('/series/')).length, 24, 'each retained list is fetched once across all four stages');
  assert.equal(requests.filter(({ url }) => url.includes('/manga/')).length, 24, 'reader and extras reuse the prepared detail');
  assert.equal(requests.filter(({ url }) => url.includes('/chapters/content')).length, 24);
  assert.equal(api.peekPreparedMangaDetail('124'), undefined, 'the excess candidate waits for a visible page change');
});
