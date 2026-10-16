import assert from 'node:assert/strict';
import test from 'node:test';
import { readGuestMangaLike, toggleGuestMangaLike } from '../src/utils/guestMangaLikes.ts';
import { createQueuedLike } from '../src/utils/queuedLike.ts';

const setupStorage = t => {
  const entries = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key),
  } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  });
};

test('guest likes survive a fresh module read and remain separate for each manga', async t => {
  setupStorage(t);
  assert.deepEqual(toggleGuestMangaLike('101', 8), { action: 'added', total: 9 });
  const fresh = await import('../src/utils/guestMangaLikes.ts?reload');
  assert.equal(fresh.readGuestMangaLike('101'), true);
  assert.equal(fresh.readGuestMangaLike('102'), false);
  assert.deepEqual(fresh.toggleGuestMangaLike('101', 8), { action: 'removed', total: 8 });
  assert.equal(readGuestMangaLike('101'), false);
});

test('rapid guest like/unlike persists the final choice without accumulating counts', async t => {
  setupStorage(t);
  const states = [];
  const queue = createQueuedLike({ liked: false, count: 8 }, async () => toggleGuestMangaLike('101', 8), state => states.push(state));
  queue.click(); queue.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(readGuestMangaLike('101'), false);
  assert.deepEqual(states.at(-1), { liked: false, count: 8 });
});

test('blocked browser storage does not falsely confirm a saved like', async t => {
  setupStorage(t);
  localStorage.setItem = () => { throw new Error('Storage blocked'); };
  const states = [];
  const queue = createQueuedLike({ liked: false, count: 8 }, async () => toggleGuestMangaLike('101', 8), state => states.push(state));
  queue.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(states.at(-1), { liked: false, count: 8 });
  assert.equal(readGuestMangaLike('101'), false);
});
