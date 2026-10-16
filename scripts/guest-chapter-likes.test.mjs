import test from 'node:test';
import assert from 'node:assert/strict';
import { readGuestChapterLike, setGuestChapterLike } from '../src/utils/guestChapterLikes.ts';

test('guest chapter likes persist independently and do not overwrite manga likes', async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const entries = new Map([['mm_manga_guest_like:101', '1']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key),
  } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  });
  setGuestChapterLike('101', true);
  const fresh = await import('../src/utils/guestChapterLikes.ts?reload');
  assert.equal(fresh.readGuestChapterLike('101'), true);
  assert.equal(readGuestChapterLike('102'), false);
  setGuestChapterLike('101', false);
  assert.equal(readGuestChapterLike('101'), false);
  assert.equal(entries.get('mm_manga_guest_like:101'), '1');
  localStorage.setItem = () => { throw new Error('Storage blocked'); };
  assert.throws(() => setGuestChapterLike('101', true), /Storage blocked/);
  assert.equal(readGuestChapterLike('101'), false);
});
