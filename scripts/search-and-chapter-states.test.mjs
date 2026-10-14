import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSearchSections } from '../src/utils/progressiveSearchSections.ts';
import { isRecentChapter } from '../src/utils/chapterFreshness.ts';

test('publica cada sección antes de solicitar la siguiente y prepara B&N antes de HOT', async () => {
  const events = [];
  const first = Promise.withResolvers();
  const pending = loadSearchSections(async (collection, stage) => {
    events.push(`load:${collection}:${stage}`);
    if (collection === 'todos' && stage === 1) await first.promise;
  }, (collection, stage) => events.push(`show:${collection}:${stage}`));
  assert.deepEqual(events, ['load:todos:1']);
  first.resolve();
  await pending;
  assert.deepEqual(events, ['todos', 'bn', 'hot'].flatMap(collection =>
    [1, 2, 3].flatMap(stage => [`load:${collection}:${stage}`, `show:${collection}:${stage}`])));
});

test('una imagen fallida no bloquea géneros ni lanzamientos', async () => {
  const published = [];
  await loadSearchSections(async () => { throw new Error('imagen no disponible'); },
    (collection, stage) => published.push(`${collection}:${stage}`));
  assert.equal(published.length, 9);
  assert.equal(published.at(-1), 'hot:3');
});

test('cerrar el buscador cancela publicaciones y futuras cargas', async () => {
  let active = true;
  const first = Promise.withResolvers();
  const loaded = [];
  const published = [];
  const pending = loadSearchSections(async (collection, stage) => {
    loaded.push([collection, stage]);
    await first.promise;
  }, (...args) => published.push(args), () => active);
  active = false;
  first.resolve();
  await pending;
  assert.equal(loaded.length, 1);
  assert.equal(published.length, 0);
});

test('Nuevo incluye siete días exactos y desaparece después', () => {
  const date = '2026-10-06T12:00:00Z';
  const week = Date.parse('2026-10-13T12:00:00Z');
  assert.equal(isRecentChapter(date, week), true);
  assert.equal(isRecentChapter(date, week + 1), false);
  assert.equal(isRecentChapter(date, Date.parse(date)), true);
});

test('Nuevo descarta fechas futuras, vacías o inválidas y acepta fecha SQL', () => {
  const now = Date.parse('2026-10-13T12:00:00');
  assert.equal(isRecentChapter('2026-10-14T12:00:00', now), false);
  assert.equal(isRecentChapter('', now), false);
  assert.equal(isRecentChapter('invalid', now), false);
  assert.equal(isRecentChapter('2026-10-12 12:00:00', now), true);
});
