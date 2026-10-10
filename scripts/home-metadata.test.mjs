import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { timeAgoDaysEs } from '../src/utils/mangaFormat.ts';

test('recent dates use full years from 365 days', () => {
  const ago = days => new Date(Date.now() - days * 86400000 - 1000).toISOString();
  assert.equal(timeAgoDaysEs(ago(364)), '364 Días');
  assert.equal(timeAgoDaysEs(ago(365)), '1 Año');
  assert.equal(timeAgoDaysEs(ago(729)), '1 Año');
  assert.equal(timeAgoDaysEs(ago(730)), '2 Años');
  assert.equal(timeAgoDaysEs('invalid'), '—');
});

test('chapter totals deduplicate requests and ids, reuse cache, preserve zero and do not cache failures', async t => {
  const storage = new Map();
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.includes('/99/')) return { ok: false };
    return { ok: true, json: async () => ({ success: true, chapters: url.includes('/2/') ? [] : [{ id: 10 }, { id: 10 }, { id: 11 }] }) };
  });
  const originalStorage = globalThis.sessionStorage;
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } });
  t.after(() => Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: originalStorage }));
  const result = await build({ entryPoints: ['src/services/mangaService.ts'], bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env': '{}' } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  assert.deepEqual(await Promise.all([api.getSeriesChapterCount(1), api.getSeriesChapterCount(1)]), [2, 2]);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(api.getCachedSeriesChapterCount(1), 2);
  assert.equal(await api.getSeriesChapterCount(1), 2);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(await api.getSeriesChapterCount(2), 0);
  assert.equal(api.getCachedSeriesChapterCount(2), 0);
  assert.equal(await api.getSeriesChapterCount(99), null);
  assert.equal(await api.getSeriesChapterCount(99), null);
  assert.equal(fetch.mock.callCount(), 4);
  assert.ok(storage.size > 0);
});
