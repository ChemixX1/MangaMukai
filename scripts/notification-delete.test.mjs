import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/services/socialService.ts'], bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' } });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('delete only clears confirmed old notifications; failure preserves the list', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalLocal = globalThis.localStorage;
  const originalSession = globalThis.sessionStorage;
  globalThis.localStorage = { getItem: () => null };
  globalThis.sessionStorage = { getItem: () => null };
  t.after(() => { globalThis.fetch = originalFetch; globalThis.localStorage = originalLocal; globalThis.sessionStorage = originalSession; });
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, notifications: [{ id: 4 }, { id: 5 }, { id: 6 }], unread_count: 3 }));
  await api.getNotifications();
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Error de borrado' }), { status: 500 });
  await assert.rejects(api.deleteNotifications(5), /Error de borrado/);
  assert.deepEqual(api.getCachedNotifications().map(item => item.id), [4, 5, 6]);
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/social\/notifications\/delete$/);
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).through_id, 5);
    return new Response(JSON.stringify({ success: true, deleted: 2 }));
  };
  await api.deleteNotifications(5);
  assert.deepEqual(api.getCachedNotifications().map(item => item.id), [6]);
});

test('localhost deletion needs no endpoint and stays cleared after refreshing notifications', async (t) => {
  const originals = { window: globalThis.window, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, fetch: globalThis.fetch };
  t.after(() => Object.assign(globalThis, originals));
  const storage = new Map([['mm_user', JSON.stringify({ id: 12 })]]);
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.sessionStorage = { getItem: () => null };
  globalThis.window = { location: { hostname: 'localhost', origin: 'http://localhost:5173' } };
  const previewBundle = await build({ entryPoints: ['src/services/socialService.ts'], bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{"DEV":true}' } });
  const preview = await import(`data:text/javascript;base64,${Buffer.from(previewBundle.outputFiles[0].text).toString('base64')}`);
  let requests = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, undefined, 'preview must not POST to the server');
    requests++;
    return new Response(JSON.stringify({ success: true, notifications: [{ id: 4, read: false }, { id: 6, read: false }], unread_count: 2 }));
  };
  await preview.getNotifications();
  await preview.deleteNotifications(4);
  assert.equal(requests, 1);
  assert.deepEqual(preview.getCachedNotifications().map(item => item.id), [6]);
  const refreshed = await preview.getNotifications();
  assert.deepEqual(refreshed.notifications.map(item => item.id), [6]);
  assert.equal(refreshed.unread, 1);
  storage.set('mm_user', JSON.stringify({ id: 13 }));
  assert.equal((await preview.getNotifications()).notifications.length, 2, 'another account keeps its notifications');
});
