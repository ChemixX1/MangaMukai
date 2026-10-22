import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export * from './src/utils/mangaDetailState';
    export { getLatestMenUpdates, peekKnownManga, getChaptersBySeries, peekSeriesChapters } from './src/services/mangaService';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' },
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const manga = { id: 23, titulo: 'Serie juvenil', tipo: 'Manga', genero: 'Hombre', genres: ['Acción'], capitulosRecientes: [] };

test('detail uses the section accent, with Hot taking priority and taxonomy supporting direct links', () => {
  assert.equal(api.mangaDetailAccent(manga), 'cyan');
  assert.equal(api.mangaDetailAccent(manga, 'pink'), 'pink');
  assert.equal(api.mangaDetailAccent({ ...manga, genero: 'Mujer' }, 'cyan'), 'cyan');
  assert.equal(api.mangaDetailAccent({ ...manga, genres: ['Hot'] }, 'cyan'), 'hot');
  assert.equal(api.mangaDetailAccent({ ...manga, genres: ['Manga Hot'] }, 'pink'), 'hot');
  assert.equal(api.mangaDetailAccent({ ...manga, genero: 'Mujer' }), 'pink');
  assert.equal(api.mangaDetailAccent(null, 'invalid'), 'pink');
});

test('home hints enable reading without mistaking a recent chapter for chapter one', () => {
  const recent = { ...manga, capitulosRecientes: [{ id: 2309, numero: '9' }] };
  assert.equal(api.hasKnownChapters(recent), true);
  assert.equal(api.knownFirstChapterId(recent), undefined);
  assert.equal(api.knownFirstChapterId({ ...recent, firstChapterId: 2301 }), 2301);
  assert.equal(api.knownFirstChapterId({ ...manga, capitulosRecientes: [{ id: 2301, numero: '1.0' }] }), 2301);
  assert.equal(api.hasKnownChapters({ ...manga, chapterCount: 12 }), true);
  assert.equal(api.hasKnownChapters({ ...manga, chapterCount: 0 }), false);
  assert.equal(api.hasKnownChapters({ ...manga, capitulosRecientes: [{ id: 0, numero: '1' }] }), false);
});

test('a complete chapter list overrides stale home metadata, including a now empty series', () => {
  const known = { ...manga, firstChapterId: 2301 };
  assert.equal(api.knownFirstChapterId(known, []), undefined);
  assert.equal(api.knownFirstChapterId(known, [{ id: 2303, chapter_number: 3 }, { id: 2302, chapter_number: 2 }]), 2302);
});

test('latest home data retains firstChapterId alongside recent chapters and shares cached chapter rows', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    requests++;
    if (url.includes('/latest-men')) return { ok: true, json: async () => ({ success: true, mangas: [{ ...manga, fecha: '2026-10-21', firstChapterId: 2301, capitulosRecientes: [{ id: 2309, numero: '9', esGratis: true }] }] }) };
    assert.match(url, /\/series\/23\/chapters/);
    return { ok: true, json: async () => ({ success: true, chapters: [{ id: 2301, chapter_number: 1 }] }) };
  });
  await api.getLatestMenUpdates();
  const known = api.peekKnownManga('23');
  assert.equal(known.firstChapterId, 2301);
  assert.equal(known.capitulosRecientes[0].id, 2309);
  assert.equal(api.knownFirstChapterId(known), 2301);
  assert.equal(api.peekSeriesChapters(23), undefined);
  const [a, b] = await Promise.all([api.getChaptersBySeries(23), api.getChaptersBySeries(23)]);
  assert.equal(a, b);
  assert.equal(api.peekSeriesChapters(23), a);
  assert.equal(requests, 2, 'opening detail can reuse both home metadata and chapter rows without another request');
});
