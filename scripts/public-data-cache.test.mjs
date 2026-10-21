import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createPublicDataCache } from '../src/utils/publicDataCache.ts';

test('simultaneous consumers share a request and revisits reuse the result until expiry', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const cache = createPublicDataCache({ ttlMs: 60_000, maxEntries: 3 });
  const deferred = Promise.withResolvers();
  let calls = 0;
  const load = () => { calls++; return deferred.promise; };
  const first = cache.load('manga:1', load);
  assert.equal(cache.load('manga:1', load), first);
  await Promise.resolve();
  assert.equal(calls, 1);
  deferred.resolve({ title: 'Manga' });
  const result = await first;
  assert.equal(await cache.load('manga:1', load), result);
  t.mock.timers.tick(59_999);
  assert.equal(cache.peek('manga:1'), result);
  t.mock.timers.tick(1);
  assert.equal(cache.peek('manga:1'), undefined, 'reads do not extend freshness');
  await cache.load('manga:1', load);
  assert.equal(calls, 2);
});

test('rejected and explicitly uncacheable results can be retried', async () => {
  const cache = createPublicDataCache({ ttlMs: 60_000, maxEntries: 3, shouldCache: value => value !== null });
  await assert.rejects(cache.load('manga:1', async () => { throw new Error('offline'); }), /offline/);
  assert.equal(await cache.load('manga:1', async () => null), null);
  assert.equal(cache.peek('manga:1'), undefined);
  assert.equal(await cache.load('manga:1', async () => 'recovered'), 'recovered');
  assert.equal(cache.peek('manga:1'), 'recovered');
});

test('memory stays bounded and keeps recently used entries', async () => {
  const cache = createPublicDataCache({ ttlMs: 60_000, maxEntries: 2 });
  await cache.load('one', async () => 1);
  await cache.load('two', async () => 2);
  assert.equal(cache.peek('one'), 1);
  await cache.load('three', async () => 3);
  assert.equal(cache.peek('two'), undefined);
  assert.equal(cache.peek('one'), 1);
  assert.equal(cache.peek('three'), 3);
});

const serviceCode = ts.transpileModule(readFileSync(new URL('../src/services/mangaService.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const manga = { id: 1, titulo: 'Manga', portada: '/cover.webp', fecha: '2026-10-20', genres: [] };

function setup(responseFor, catalog = null) {
  const requests = [];
  const titles = new Map();
  const blockedStorage = {
    getItem(key) {
      if (catalog && key === 'mangamukai:catalog-cache:v1') return JSON.stringify({ data: catalog, expiresAt: Date.now() + 60_000 });
      throw new Error('Storage disabled');
    },
    removeItem() { throw new Error('Storage disabled'); },
    setItem() { throw new Error('Storage disabled'); },
  };
  const exports = {};
  vm.runInNewContext(serviceCode, {
    exports, Date,
    window: { sessionStorage: blockedStorage, requestIdleCallback: callback => callback() },
    sessionStorage: blockedStorage,
    console: { error() {} },
    require: name => name.includes('publicDataCache')
      ? { createPublicDataCache }
      : name.includes('mangaTitles') ? { rememberMangaTitle: (id, title) => titles.set(String(id), title) }
      : { MANGAMUKAI_API: '/api', WORDPRESS_POSTS_API: '/posts' },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => responseFor(url) };
    },
  });
  return { service: exports, requests, titles };
}

test('home, search and recommendation responses remember titles without fetching details', async () => {
  const { service, requests, titles } = setup(url => ({ success: true, mangas: [{ ...manga, titulo: url }] }));
  for (const load of [
    () => service.getPopularWomenByViews('historical', false),
    () => service.getLatestMenUpdates(72),
    () => service.getUltimosCapitulos(),
    () => service.getRelatedMangas(9),
  ]) {
    const items = await load();
    assert.equal(titles.get('1'), items[0].titulo);
  }
  assert.equal(requests.length, 4);
  assert.ok(requests.every(({ url }) => !url.includes('/manga/')));
});

test('a restored catalog also supplies titles without a network request', async () => {
  const { service, requests, titles } = setup(() => { throw new Error('unexpected fetch'); }, [manga]);
  await service.getUltimosCapitulos();
  assert.equal(titles.get('1'), manga.titulo);
  assert.equal(requests.length, 0);
});

test('public service caches are shared across consumers while keeping keys distinct', async () => {
  const { service, requests } = setup(url => url.startsWith('/posts')
    ? [{ id: 1, title: { rendered: 'Manga' }, date: '2026-10-20', categories: [] }]
    : url.startsWith('/api/manga/')
      ? { success: true, ...manga }
      : { success: true, mangas: [manga] });

  const consumers = [
    () => service.getNewReleases(),
    () => service.getMangaById(1),
    () => service.getLatestWomenUpdates(18),
    () => service.getLatestMenUpdates(18),
    () => service.getRelatedMangas(1, 10),
  ];
  for (const consume of consumers) {
    const [first, second] = await Promise.all([consume(), consume()]);
    assert.equal(first, second);
    assert.equal(await consume(), first);
  }
  assert.equal(requests.length, 5);
  await service.getLatestWomenUpdates(72);
  await service.getRelatedMangas(1, 18);
  await service.getMangaById(2);
  assert.equal(requests.length, 8, 'different audiences, ids and limits do not collide');
  assert.ok(requests.every(request => request.options === undefined), 'public requests keep their original fetch options');
});

test('chapter lists and their count expire, so a revisit can see newly released chapters', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  let chapters = [{ id: 1, chapter_number: 1, is_paid: true, price_coins: 5 }];
  const { service, requests } = setup(() => ({ success: true, chapters }));
  const [first, second] = await Promise.all([service.getChaptersBySeries(1), service.getChaptersBySeries('1')]);
  assert.equal(first, second);
  assert.equal(requests.length, 1);
  assert.equal(service.getCachedSeriesChapterCount(1), 1);
  chapters = [...chapters, { id: 2, chapter_number: 2, is_paid: false, price_coins: 0 }];
  t.mock.timers.tick(60_000);
  assert.equal(service.getCachedSeriesChapterCount(1), null);
  const refreshed = await service.getChaptersBySeries(1);
  assert.equal(refreshed.length, 2);
  assert.equal(requests.length, 2);
});

test('temporary empty responses and blocked browser storage do not prevent retrying', async () => {
  let available = false;
  const { service, requests } = setup(() => ({ success: available, mangas: available ? [manga] : [] }));
  assert.equal((await service.getLatestWomenUpdates()).length, 0);
  available = true;
  assert.equal((await service.getLatestWomenUpdates()).length, 1);
  assert.equal((await service.getUltimosCapitulos()).length, 1);
  assert.equal(requests.length, 3);
  assert.equal((await service.getUltimosCapitulos()).length, 1);
  assert.equal(requests.length, 3, 'the in-memory catalogue still works when storage is blocked');
});
