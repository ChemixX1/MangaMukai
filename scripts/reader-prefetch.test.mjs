import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({ entryPoints: ['src/services/readerPrefetchSession.ts'], bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' } });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const chapters = [1, 2, 3].map(id => ({ id, chapter_number: id, title: `Capítulo ${id}`, is_paid: false, price_coins: 0 }));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function setup(t, { stalled = false, locked = false } = {}) {
  const originals = Object.fromEntries(['fetch', 'Image', 'localStorage', 'sessionStorage', 'document'].map(key => [key, globalThis[key]]));
  let token = null;
  let user = null;
  globalThis.localStorage = globalThis.sessionStorage = { getItem: key => key === 'mm_token' ? token : key === 'mm_user' && user ? JSON.stringify(user) : null };
  globalThis.document = { hidden: false };
  const requests = [];
  const images = [];
  globalThis.Image = class {
    complete = false;
    set src(url) {
      this.url = url;
      images.push(this);
      if (!stalled) queueMicrotask(() => { this.complete = true; this.onload?.(); });
    }
    removeAttribute() { this.aborted = true; }
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    const id = /[?&]id=(\d+)/.exec(url)?.[1] || /\/(\d+)\?/.exec(url)?.[1] || '1';
    const data = url.includes('/chapters/content')
      ? locked ? { success: false, locked: true, price: 20 } : { success: true, images: Array.from({ length: 22 }, (_, index) => `https://images.test/${id}/${index}.webp`) }
      : url.includes('/chapters') ? { success: true, chapters }
      : { id, title: { rendered: `Capítulo ${id}` }, ero_seri: 100, ero_chapter: Number(id) };
    return { ok: true, json: async () => data };
  };
  t.after(() => { api.clearReaderPrefetch(); Object.assign(globalThis, originals); });
  return { requests, images, setToken: value => { token = value; }, setUser: value => { user = value; } };
}

test('refreshing the token for the same account preserves loaded pages and in-flight images', async t => {
  const { images, setToken, setUser } = setup(t, { stalled: true });
  setUser({ id: 7, isPremium: false });
  setToken('original-token');
  const session = api.mangaReaderSession('100', '100', chapters);
  const data = await session.load('1');
  const warming = session.warmImages(data);
  const rejected = assert.rejects(warming, { name: 'AbortError' });
  setToken('renewed-token');
  api.syncReaderPrefetchAuth();
  assert.equal(session.peek('1'), data);
  assert.ok(images.every(image => !image.aborted));

  setUser({ id: 7, isPremium: true });
  api.syncReaderPrefetchAuth();
  await rejected;
  assert.equal(session.peek('1'), undefined);
  assert.ok(images.every(image => image.aborted));
});

test('prefetch downloads only five strips of a long chapter', async t => {
  const { images } = setup(t);
  const session = api.mangaReaderSession('100', '100', chapters);
  const data = await session.load('1');
  assert.equal(data.images.length, 22);
  await session.warmImages(data);
  assert.equal(images.length, 5);
  assert.ok(images.every(image => image.fetchPriority === 'low'));
});

test('detail and reader reuse chapter data and the already loaded chapter list', async t => {
  const { requests } = setup(t);
  const detail = api.mangaReaderSession('alias', '100', chapters);
  await detail.load('1');
  api.syncReaderPrefetchRoute('/read/1');
  const reader = api.chapterReaderSession('1');
  assert.equal(reader, detail);
  await reader.load('1');
  assert.deepEqual(await reader.siblings('100'), chapters);
  assert.equal(requests.length, 1);
  api.syncReaderPrefetchRoute('/manga/alias');
  assert.equal(api.mangaReaderSession('alias', '100', chapters), reader);
});

test('home keeps multiple manga prepared and promotes only the selected reader', async t => {
  const { requests } = setup(t);
  const first = api.homeReaderSession('alias', '100', chapters);
  await first.load('1');
  const other = api.homeReaderSession('200', '200', [{ ...chapters[0], id: 9 }]);
  assert.equal(api.peekReaderSession('1'), first);
  assert.equal(api.peekReaderSession('9'), other);
  api.syncReaderPrefetchRoute('/read/1');
  assert.equal(api.chapterReaderSession('1'), first);
  await first.load('1');
  assert.equal(requests.length, 1);
  assert.equal(api.peekReaderSession('9'), null);
  await assert.rejects(other.load('9'), { name: 'AbortError' });
});

test('home-to-detail navigation keeps the prepared chapter and its alias', async t => {
  setup(t);
  const prepared = api.homeReaderSession('alias', '100', chapters);
  const data = await prepared.load('1');
  api.syncReaderPrefetchRoute('/manga/alias');
  api.pauseHomeReaderSession(prepared);
  assert.equal(api.mangaReaderSession('alias', '100', chapters), prepared);
  assert.equal(prepared.peek('1'), data);
  api.syncReaderPrefetchRoute('/read/1');
  assert.equal(api.chapterReaderSession('1').peek('1'), data);
});

test('home sessions expire, stay bounded and never survive a changed account', async t => {
  const { setToken } = setup(t);
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  for (let id = 1; id <= 129; id++) api.homeReaderSession(String(id), String(id), [{ ...chapters[0], id }]);
  assert.equal(api.peekReaderSession('1'), null);
  assert.ok(api.peekReaderSession('129'));
  t.mock.timers.tick(5 * 60 * 1000);
  assert.equal(api.peekReaderSession('129'), null);
  api.homeReaderSession('100', '100', chapters);
  setToken('another-account');
  api.syncReaderPrefetchAuth();
  assert.equal(api.peekReaderSession('1'), null);
});

test('chapter metadata is available synchronously before content or background prefetch', async t => {
  const { requests } = setup(t);
  const detail = api.mangaReaderSession('alias', '100', chapters);
  assert.equal(api.peekReaderSession('2'), detail);
  assert.deepEqual(api.peekReaderSession('2').peekSiblings(), chapters);
  assert.equal(detail.peek('2'), undefined);
  assert.equal(requests.length, 0);
  api.syncReaderPrefetchRoute('/read/2');
  detail.pause();
  assert.equal(api.peekReaderSession('3').peekSiblings()[2].chapter_number, 3);
  detail.invalidate('2');
  assert.equal(api.peekReaderSession('2').peekSiblings()[1].chapter_number, 2);
  assert.equal(api.peekReaderSession('900'), null);
});

test('entering a chapter cancels its speculative images and keeps its URLs', async t => {
  const { images } = setup(t, { stalled: true });
  const session = api.mangaReaderSession('100', '100', chapters);
  const data = await session.load('1');
  const warming = session.warmImages(data);
  const rejected = assert.rejects(warming, { name: 'AbortError' });
  api.syncReaderPrefetchRoute('/read/1');
  await rejected;
  assert.ok(images.every(image => image.aborted));
  assert.equal(api.chapterReaderSession('1').peek('1'), data);
});

test('other sections and other manga discard the session and cancel downloads', async t => {
  const { images } = setup(t, { stalled: true });
  const previous = api.mangaReaderSession('100', '100', chapters);
  const data = await previous.load('1');
  const rejected = assert.rejects(previous.warmImages(data), { name: 'AbortError' });
  api.syncReaderPrefetchRoute('/tienda');
  await rejected;
  assert.ok(images.every(image => image.aborted));
  assert.equal(previous.peek('1'), undefined);
  await assert.rejects(previous.load('1'), { name: 'AbortError' });
  const next = api.mangaReaderSession('200', '200', [{ ...chapters[0], id: 4 }]);
  assert.notEqual(previous, next);
  api.syncReaderPrefetchRoute('/manga/300');
  await assert.rejects(next.load('4'), { name: 'AbortError' });
});

test('reader downloads both immediate neighbors completely, next before previous', async t => {
  const { requests, images } = setup(t);
  const session = api.mangaReaderSession('100', '100', [...chapters, { id: 4, chapter_number: 4, is_paid: true, price_coins: 20 }]);
  session.focus('2');
  session.warmAround([...chapters, { id: 4, chapter_number: 4, is_paid: true, price_coins: 20 }], '2', new Set());
  await delay(180);
  const content = requests.filter(request => request.url.includes('/chapters/content'));
  assert.deepEqual(content.map(request => /id=(\d+)/.exec(request.url)[1]), ['3', '1']);
  assert.equal(images.length, 44);
});

test('reader continues a five-strip detail prefetch without re-requesting those strips', async t => {
  const { images } = setup(t);
  const session = api.mangaReaderSession('100', '100', chapters);
  const next = await session.load('3');
  await session.warmImages(next);
  assert.equal(images.length, 5);
  session.focus('2');
  session.warmAround(chapters, '2', new Set());
  await delay(180);
  assert.equal(images.filter(image => image.url.includes('/3/')).length, 22);
  assert.equal(new Set(images.map(image => image.url)).size, 44);
  session.warmAround(chapters, '2', new Set());
  await delay(180);
  assert.equal(images.length, 44);
});

test('locked neighbor is skipped until a confirmed purchase invalidates its bundle', async t => {
  const { images, requests } = setup(t);
  const paidChapters = chapters.map(chapter => ({ ...chapter, is_paid: chapter.id === 3 }));
  const session = api.mangaReaderSession('100', '100', paidChapters);
  session.focus('2');
  session.warmAround(paidChapters, '2', new Set());
  await delay(180);
  assert.equal(requests.some(request => request.url.includes('content?id=3')), false);
  session.invalidate('3');
  session.warmAround(paidChapters, '2', new Set(['3']));
  await delay(180);
  assert.equal(images.filter(image => image.url.includes('/3/')).length, 22);
});

test('changing authentication discards cached access decisions', async t => {
  const { setToken } = setup(t, { locked: true });
  const session = api.chapterReaderSession('1');
  const data = await session.load('1');
  assert.equal(data.locked, true);
  assert.deepEqual(data.images, []);
  setToken('test-token');
  api.syncReaderPrefetchRoute('/read/1');
  assert.notEqual(api.chapterReaderSession('1'), session);
  assert.equal(session.peek('1'), undefined);
});

test('leaving before the background queue starts prevents all chapter requests', async t => {
  const { requests, images } = setup(t);
  const session = api.mangaReaderSession('100', '100', chapters);
  session.warmAround(chapters, '', new Set());
  api.syncReaderPrefetchRoute('/comunidad');
  await delay(180);
  assert.equal(requests.length, 0);
  assert.equal(images.length, 0);
});

test('the reader reserves loading space until image dimensions are known', async () => {
  const result = await build({ entryPoints: ['src/components/manga/ReaderImages.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], define: { 'import.meta.env': '{}' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  const images = Array.from({ length: 40 }, (_, i) => ({ id: String(i), page_number: i + 1, image_url: `https://images.test/${i}.webp` }));
  const html = renderToStaticMarkup(createElement(module.exports.ReaderImages, { images, title: 'Prueba', onComplete: () => assert.fail('Rendering must not mark the chapter complete') }));
  assert.equal(html.match(/<img\b/g), null);
  assert.match(html, /role="status"/);
  assert.match(html, /min-h-60/);
});

 test('decoded batches retain dimensions and identical metadata does not restart downloads', async () => {
  const result = await build({ entryPoints: ['src/components/manga/ReaderImages.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], define: { 'import.meta.env': '{}' } });
  const slots = []; let cursor = 0; const effects = []; const cleanups = [];
  const hooks = {
    useState(initial) { const i = cursor++; slots[i] ??= initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, j) => d !== slots[i][j])) { slots[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
  };
  const require = createRequire(import.meta.url); const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(name => name === 'react' ? hooks : require(name), module, module.exports);
  const previousImage = globalThis.Image; const previousWindow = globalThis.window;
  const downloads = []; let completed = 0;
  globalThis.window = { setTimeout, clearTimeout };
  globalThis.Image = class {
    naturalWidth = 800; naturalHeight = 1200;
    set src(url) { downloads.push(this); this.url = url; }
    decode() { return Promise.resolve(); }
    removeAttribute() {}
  };
  const images = Array.from({ length: 7 }, (_, i) => ({ id: String(i), page_number: i + 1, image_url: `https://images.test/${i}.webp` }));
  const render = () => { cursor = 0; module.exports.ReaderImages({ images: images.map(p => ({ ...p })), onComplete: () => completed++ }); effects.splice(0).forEach(fn => fn()); };
  try {
    render(); assert.equal(downloads.length, 5); assert.equal(slots[0].length, 0);
    downloads.slice().forEach(image => image.onload()); await delay(0);
    assert.equal(slots[0].length, 5); assert.equal(downloads.length, 7);
    assert.ok(slots[0].every(page => page.width === 800 && page.height === 1200));
    render(); assert.equal(downloads.length, 7); assert.equal(slots[0].length, 5);
    downloads.slice(5).forEach(image => image.onload()); await delay(0);
    assert.equal(slots[0].length, 7); assert.equal(completed, 1);
  } finally {
    cleanups.forEach(fn => fn?.()); globalThis.Image = previousImage; globalThis.window = previousWindow;
  }
});
