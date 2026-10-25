import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export * from './src/services/interactionsService';
    export { getLatestMenUpdates, getMangaById, peekKnownMangas, getSeriesChapterCount, getChaptersBySeries, peekSeriesChapters } from './src/services/mangaService';
    export { buildMangaRecommendations } from './src/utils/mangaRecommendations';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' },
});
let run = 0;
async function setup(t, fetcher) {
  const previous = Object.fromEntries(['window', 'localStorage', 'sessionStorage'].map(key => [key, globalThis[key]]));
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  globalThis.localStorage = globalThis.sessionStorage = storage;
  globalThis.window = { location: { hostname: 'localhost', origin: 'http://localhost' } };
  t.after(() => Object.assign(globalThis, previous));
  t.mock.method(globalThis, 'fetch', fetcher);
  const source = `${bundle.outputFiles[0].text}\n// case ${++run}`;
  const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  return { api, entries };
}
const response = data => ({ ok: true, json: async () => ({ success: true, ...data }) });
const interactions = { online_readers: 2, bookmarks: [], likes: [], history: [], manga_likes: 14, manga_bookmarks: 3 };

test('Home supplies recommendations immediately and incomplete detail metadata preserves chapter hints', async t => {
  const requests = [];
  const home = [
    { id: 1, titulo: 'Primera', fecha: '2026-10-22', chapterCount: 9, firstChapterId: 11, totalViews: 1234, genres: ['Acción'] },
    { id: 2, titulo: 'Similar', fecha: '2026-10-22', chapterCount: 4, genres: ['Acción'] },
  ];
  const { api } = await setup(t, async url => {
    requests.push(url);
    if (url.includes('/latest-men')) return response({ mangas: home });
    assert.match(url, /\/manga\/1$/);
    return response({ id: 1, titulo: 'Primera', fecha: '2026-10-22' });
  });
  await api.getLatestMenUpdates();
  const known = api.peekKnownMangas();
  assert.equal(api.buildMangaRecommendations(known[0], known, [])[0].id, 2);
  assert.equal(requests.length, 1, 'local recommendations require no catalog request');
  const detail = await api.getMangaById(1);
  assert.equal(detail.firstChapterId, 11);
  assert.equal(detail.chapterCount, 9);
  assert.equal(detail.totalViews, 1234, 'a detail response without views preserves Home totals');
  assert.equal(api.peekKnownMangas().find(manga => manga.id === 1).totalViews, 1234);
  assert.equal(requests.length, 2, 'no extra catalog request is needed for views');
});

test('explicit zero views from the detail replace the Home count', async t => {
  const { api } = await setup(t, async url => url.includes('/latest-men')
    ? response({ mangas: [{ id: 1, titulo: 'Primera', fecha: '2026-10-22', totalViews: 1234 }] })
    : response({ id: 1, titulo: 'Primera', fecha: '2026-10-22', totalViews: 0 }));
  await api.getLatestMenUpdates();
  assert.equal((await api.getMangaById(1)).totalViews, 0);
});

test('missing view counts stay unknown until provided, rather than becoming a false zero', async t => {
  const { api } = await setup(t, async () => response({
    mangas: [{ id: 1, titulo: 'Primera', fecha: '2026-10-22' }],
  }));
  await api.getLatestMenUpdates();
  assert.equal(api.peekKnownMangas()[0].totalViews, undefined);
});

test('chapter failures remain retryable and are not cached as an empty series', async t => {
  let requests = 0;
  const { api } = await setup(t, async () => ++requests === 1
    ? { ok: false }
    : response({ chapters: [{ id: 11, chapter_number: 1 }] }));
  await assert.rejects(api.getChaptersBySeries(1, { throwOnError: true }), /capítulos/);
  assert.equal(api.peekSeriesChapters(1), undefined);
  assert.equal((await api.getChaptersBySeries(1, { throwOnError: true }))[0].id, 11);
  assert.equal(requests, 2);
});

test('Home chapter totals remain available after full chapter rows expire', async t => {
  const { api } = await setup(t, async url => {
    if (url.includes('/latest-men')) return response({ mangas: [{ id: 1, titulo: 'Primera', fecha: '2026-10-22' }] });
    if (url.includes('/series/')) return response({ chapters: [{ id: 11, chapter_number: 1 }] });
    return response({ id: 1, titulo: 'Primera', fecha: '2026-10-22' });
  });
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  await api.getLatestMenUpdates();
  await api.getSeriesChapterCount(1);
  t.mock.timers.tick(120_000);
  assert.equal(api.peekSeriesChapters(1), undefined);
  assert.equal(api.peekKnownMangas()[0].chapterCount, 1);
  assert.equal((await api.getMangaById(1)).chapterCount, 1);
});

test('prefetch and detail share likes, then refresh after the short cache expires', async t => {
  let requests = 0;
  const { api } = await setup(t, async () => { requests++; return response(interactions); });
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const [a, b] = await Promise.all([api.getInteractions('1'), api.getInteractions('1')]);
  assert.deepEqual(a, b);
  assert.equal(requests, 1);
  assert.equal(api.peekInteractions('1').manga_likes, 14);
  await api.getInteractions('1');
  assert.equal(requests, 1);
  t.mock.timers.tick(60_000);
  assert.equal(api.peekInteractions('1'), undefined);
  await api.getInteractions('1');
  assert.equal(requests, 2);
});

test('guest toggles reuse the public total without double counting or another GET', async t => {
  let requests = 0;
  const { api } = await setup(t, async () => { requests++; return response(interactions); });
  await api.getInteractions('1');
  await api.toggleMangaLike('1', 14);
  assert.equal(api.peekInteractions('1').manga_likes, 15);
  assert.deepEqual(api.peekInteractions('1').likes, ['1']);
  await api.toggleMangaLike('1', 14);
  assert.equal((await api.getInteractions('1')).manga_likes, 14);
  assert.deepEqual(api.peekInteractions('1').likes, []);
  assert.equal(requests, 1);
});

test('an account change discards cached likes and ignores the previous session response', async t => {
  const slow = Promise.withResolvers();
  let requests = 0;
  const { api, entries } = await setup(t, async () => {
    requests++;
    if (requests === 1) return slow.promise;
    return response({ ...interactions, likes: ['2'] });
  });
  entries.set('mm_token', 'first');
  const pending = api.getInteractions('1');
  entries.set('mm_token', 'second');
  assert.equal(api.peekInteractions('1'), undefined);
  await api.getInteractions('1');
  slow.resolve(response({ ...interactions, likes: ['1'] }));
  assert.equal(await pending, null);
  assert.deepEqual(api.peekInteractions('1').likes, ['2']);
  entries.delete('mm_token');
  assert.equal(api.peekInteractions('1'), undefined);
});

test('a confirmed like updates cached series and a late GET cannot restore the old choice', async t => {
  const slow = Promise.withResolvers();
  const { api, entries } = await setup(t, async (url, options) => {
    if (options?.method === 'POST') return response({ action: 'added', total_likes: 15 });
    if (url.endsWith('manga_id=3')) return slow.promise;
    return response(interactions);
  });
  entries.set('mm_token', 'member');
  await Promise.all([api.getInteractions('1'), api.getInteractions('2')]);
  const pending = api.getInteractions('3');
  await api.toggleMangaLike('1');
  assert.equal(api.peekInteractions('1').manga_likes, 15);
  assert.deepEqual(api.peekInteractions('1').likes, ['1']);
  assert.deepEqual(api.peekInteractions('2').likes, ['1']);
  assert.equal(api.peekInteractions('2').manga_likes, 14);
  slow.resolve(response(interactions));
  assert.equal(await pending, null);
  assert.equal(api.peekInteractions('3'), undefined);
});
