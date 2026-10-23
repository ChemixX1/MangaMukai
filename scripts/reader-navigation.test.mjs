import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const services = await build({
  stdin: { contents: `export * from './src/services/readerPrefetchSession';
    export * from './src/services/chapterMetadata';
    export * from './src/services/mangaTitles';
    export { getBackgroundPolicy } from './src/utils/backgroundTasks';
    export { getLatestWomenUpdates, getUltimosCapitulos, getChaptersBySeries } from './src/services/mangaService';
    export { getStoredUser, getStoredToken, getAuthCacheKey, AUTH_CHANGED_EVENT } from './src/services/authService';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.env': '{}' },
});
const page = await build({ entryPoints: ['src/pages/ReaderPage.tsx'], bundle: true, write: false,
  platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'react-router-dom', 'lucide-react', '../*'] });
const tick = () => new Promise(resolve => setImmediate(resolve));
const scheduled = () => new Promise(resolve => setTimeout(resolve, 0));
const require = createRequire(import.meta.url);
const siblings = [0, 1.5, 2].map((number, index) => ({ id: 1001 + index, chapter_number: number, title: `Capítulo ${number}`, is_paid: false, price_coins: 0 }));

function setup(t) {
  const previous = Object.fromEntries(['fetch', 'Image', 'window', 'document', 'localStorage', 'sessionStorage'].map(key => [key, globalThis[key]]));
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const device = { onLine: true, hardwareConcurrency: 8, deviceMemory: 8, connection: Object.assign(new EventTarget(), { effectiveType: '4g' }) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: device });
  const stored = new Map();
  const storage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  globalThis.localStorage = globalThis.sessionStorage = storage;
  globalThis.window = Object.assign(new EventTarget(), { location: { hostname: 'localhost' }, sessionStorage: storage });
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  const images = [];
  globalThis.Image = class {
    complete = false;
    set src(url) { this.url = url; images.push(this); }
    removeAttribute() { this.aborted = true; }
  };
  const requests = [];
  const content = new Map();
  let listGate;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.includes('/chapters/content')) {
      const id = new URL(url, 'http://localhost').searchParams.get('id');
      const gate = Promise.withResolvers();
      content.set(id, gate);
      options.signal.addEventListener('abort', () => gate.reject(new DOMException('Aborted', 'AbortError')), { once: true });
      return { ok: true, json: () => gate.promise };
    }
    if (url.includes('/series/')) {
      if (listGate) await listGate.promise;
      return { ok: true, json: async () => ({ success: true, chapters: siblings }) };
    }
    if (url.includes('/latest-women')) return { ok: true, json: async () => ({ success: true, mangas: [{
      id: 100, titulo: 'Serie del inicio', fecha: '2026-10-21', esGratis: true,
      capitulosRecientes: siblings.slice(0, 2).map(chapter => ({ id: chapter.id, numero: String(chapter.chapter_number), esGratis: true })),
    }] }) };
    const id = /\/(\d+)\?/.exec(url)?.[1];
    assert.ok(id, `Unexpected request: ${url}`);
    return { ok: true, json: async () => ({ title: { rendered: `Serie — Capítulo ${id}` }, ero_seri: 100, ero_chapter: siblings.find(chapter => String(chapter.id) === id)?.chapter_number }) };
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', services.outputFiles[0].text)(require, module, module.exports);
  const api = module.exports;
  let route = '1002';
  let cursor = 0;
  const slots = [], effects = [], cleanups = [];
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((value, j) => value !== slots[i][j])) {
        slots[i] = deps;
        effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
      }
    },
  };
  const pageModule = { exports: {} };
  const imports = name => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-router-dom') return { Link: 'Link', useParams: () => ({ chapterId: route }), useLocation: () => ({ pathname: `/read/${route}`, search: '', hash: '' }), useNavigate: () => () => {} };
    if (name.endsWith('/mangaService')) return { ...api, trackChapterView: async () => {} };
    if (['readerPrefetchSession', 'chapterMetadata', 'mangaTitles', 'authService', 'backgroundTasks'].some(service => name.endsWith(`/${service}`))) return api;
    if (name.endsWith('/useTheme')) return { useTheme: () => ({ theme: 'dark', toggleTheme() {} }) };
    if (name.endsWith('/useDocumentTitle')) return { useDocumentTitle() {} };
    if (name.endsWith('/mangaFormat')) return { cleanTitle: value => value };
    if (name.endsWith('/communityService')) return { getMangaComments: async () => [] };
    return new Proxy({}, { get: (_, key) => key });
  };
  new Function('require', 'module', 'exports', page.outputFiles[0].text)(imports, pageModule, pageModule.exports);
  const render = () => { cursor = 0; return pageModule.exports.ReaderPage(); };
  const commit = () => effects.splice(0).forEach(effect => effect());
  const unmount = () => { cleanups.forEach(cleanup => cleanup?.()); cleanups.length = 0; };
  t.after(() => {
    unmount(); api.clearReaderPrefetch(); Object.assign(globalThis, previous);
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor); else delete globalThis.navigator;
  });
  return { api, requests, render, commit, content, stored, device, images, unmount,
    navigate: id => { route = id; api.syncReaderPrefetchRoute(`/read/${id}`); },
    stallList: () => { listGate = Promise.withResolvers(); return listGate.resolve; },
  };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) {
    const result = find(child, predicate);
    if (result) return result;
  }
}
const selector = tree => find(tree, node => node.type === 'ReaderChapterSelect').props;

test('home chapter numbers render immediately without any reader prefetch, including zero and decimals', async t => {
  const env = setup(t);
  await env.api.getLatestWomenUpdates();
  assert.equal(env.requests.length, 1);
  assert.equal(env.api.peekReaderSession('1002'), null);
  assert.equal(selector(env.render()).number, 1.5);
  env.navigate('1001');
  assert.equal(selector(env.render()).number, 0);
  assert.equal(env.requests.length, 1, 'first render requires no metadata request');
});

test('reader starts its shared chapter list before content and displays it while content is stalled', async t => {
  const env = setup(t);
  await env.api.getLatestWomenUpdates();
  const release = env.stallList();
  const homeRequest = env.api.getChaptersBySeries('100');
  env.render(); env.commit();
  await tick();
  assert.ok(env.content.has('1002'));
  assert.equal(env.requests.filter(({ url }) => url.includes('/series/')).length, 1);
  assert.equal(env.requests.some(({ url }) => url.includes('/posts/')), false);
  release(); await homeRequest; await tick();
  const tree = env.render();
  assert.equal(selector(tree).number, 1.5);
  assert.deepEqual(selector(tree).options.map(option => option.number), [0, 1.5, 2]);
  assert.equal(find(tree, node => node.props?.['aria-label'] === 'Capítulo siguiente').props.disabled, false);
  assert.equal(env.api.peekReaderSession('1002').peek('1002'), undefined, 'chapter content has not completed');
});

test('direct links publish metadata and the selector without waiting for chapter content', async t => {
  const env = setup(t);
  assert.equal(selector(env.render()).number, undefined);
  env.commit(); await tick();
  assert.equal(selector(env.render()).number, 1.5);
  assert.equal(selector(env.render()).options.length, 3);
  assert.equal(env.requests.filter(({ url }) => url.includes('/posts/')).length, 1, 'metadata shared by navigation and content');
  assert.equal(env.requests.filter(({ url }) => url.includes('/series/')).length, 1);
  assert.equal(env.api.peekReaderSession('1002').peek('1002'), undefined);
});

test('navigation does not flash the previous chapter and late responses cannot replace the selected chapter', async t => {
  const env = setup(t);
  await env.api.getLatestWomenUpdates();
  env.render(); env.commit(); await tick();
  assert.equal(selector(env.render()).number, 1.5);
  env.navigate('1001');
  assert.equal(selector(env.render()).number, 0);
  env.commit(); await tick();
  env.content.get('1002').resolve({ success: true, images: ['https://images.test/old.webp'] });
  await tick();
  const selected = selector(env.render());
  assert.equal(selected.value, '1001');
  assert.equal(selected.number, 0);
  assert.equal(selected.options.length, 3);
});

test('public chapter identity survives account changes without retaining reader access or images', async t => {
  const env = setup(t);
  await env.api.getLatestWomenUpdates();
  env.render(); env.commit(); await tick();
  env.stored.set('mm_token', 'another-account');
  env.api.syncReaderPrefetchAuth();
  assert.equal(env.api.peekReaderSession('1002'), null);
  assert.equal(selector(env.render()).number, 1.5);
});

test('restored catalog data supplies chapter numbers; missing and invalid numbers are never invented', async t => {
  const env = setup(t);
  env.stored.set('mangamukai:catalog-cache:v1', JSON.stringify({ expiresAt: Date.now() + 60_000, data: [{
    id: 100, titulo: 'Serie guardada', capitulosRecientes: [{ id: 1002, numero: '1,5' }],
  }] }));
  await env.api.getUltimosCapitulos();
  assert.equal(selector(env.render()).number, 1.5);
  for (const number of ['', '—', null, undefined, Infinity, '2x']) {
    env.api.rememberChapterMetadata('invalid', '100', number);
    assert.equal(env.api.peekChapterMetadata('invalid'), undefined);
  }
  assert.equal(env.requests.length, 0);
});

for (const interruption of ['slow network', 'offline']) {
  test(`reader resumes the next chapter after ${interruption} without restarting allowed downloads`, async t => {
    const env = setup(t);
    env.api.mangaReaderSession('100', '100', siblings);
    env.render(); env.commit(); await tick();
    env.content.get('1002').resolve({ success: true, images: ['https://images.test/current.webp'] });
    await tick();
    find(env.render(), node => node.type === 'ReaderImages').props.onComplete();
    await scheduled();
    env.content.get('1003').resolve({ success: true, images: Array.from({ length: 8 }, (_, i) => `https://images.test/next/${i}.webp`) });
    await tick();
    assert.equal(env.images.length, 2);
    env.images[0].onload(); await tick();
    const before = env.images.length;
    if (interruption === 'offline') {
      env.device.onLine = false;
      window.dispatchEvent(new Event('offline'));
    } else {
      env.device.connection.effectiveType = '3g';
      env.device.connection.dispatchEvent(new Event('change'));
    }
    await tick();
    assert.ok(env.images.slice(1).every(image => image.aborted));
    env.device.onLine = true;
    env.device.connection.effectiveType = '4g';
    if (interruption === 'offline') window.dispatchEvent(new Event('online'));
    else env.device.connection.dispatchEvent(new Event('change'));
    await scheduled(); await tick();
    assert.deepEqual(env.images.slice(before).map(image => image.url), ['https://images.test/next/1.webp', 'https://images.test/next/2.webp']);
    assert.equal(env.requests.filter(({ url }) => url.includes('/chapters/content?id=1003')).length, 1);
    env.device.connection.dispatchEvent(new Event('change'));
    window.dispatchEvent(new Event('online'));
    await scheduled();
    assert.equal(env.images.length, before + 2, 'allowed-to-allowed events keep current speculative downloads');
    assert.ok(env.images.slice(before).every(image => !image.aborted));
  });
}

test('network recovery respects foreground loading and hidden state, and listeners stop on unmount', async t => {
  const env = setup(t);
  env.device.connection.effectiveType = '3g';
  env.api.mangaReaderSession('100', '100', siblings);
  env.render(); env.commit(); await tick();
  env.content.get('1002').resolve({ success: true, images: ['https://images.test/current.webp'] });
  await tick();
  env.device.connection.effectiveType = '4g';
  env.device.connection.dispatchEvent(new Event('change'));
  await scheduled();
  assert.equal(env.content.has('1003'), false, 'current images must finish first');
  document.hidden = true;
  find(env.render(), node => node.type === 'ReaderImages').props.onComplete();
  env.device.onLine = false; window.dispatchEvent(new Event('offline'));
  env.device.onLine = true; window.dispatchEvent(new Event('online'));
  await scheduled();
  assert.equal(env.content.has('1003'), false, 'hidden pages stay paused after recovery');
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  await scheduled();
  assert.equal(env.content.has('1003'), true);
  const requestsBefore = env.requests.length;
  env.unmount();
  env.device.onLine = false; window.dispatchEvent(new Event('offline'));
  env.device.onLine = true; window.dispatchEvent(new Event('online'));
  env.device.connection.dispatchEvent(new Event('change'));
  await scheduled();
  assert.equal(env.requests.length, requestsBefore);
});
