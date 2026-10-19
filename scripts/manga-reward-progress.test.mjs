import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import {
  REWARD_PROGRESS_EVENT,
  calculateMangaRewardProgress,
  getCompletedRewardChapterIds,
  getAccountCompletedRewardChapterIds,
  recordCompletedRewardChapter,
  subscribeMangaRewardProgress,
} from '../src/services/mangaRewardProgress.ts';

const installBrowser = t => {
  const entries = new Map();
  const storage = {
    get length() { return entries.size; },
    key: index => [...entries.keys()][index] ?? null,
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key),
  };
  const browser = Object.assign(new EventTarget(), { location: { hostname: 'localhost', origin: 'http://localhost' } });
  for (const [key, value] of Object.entries({ window: browser, localStorage: storage, sessionStorage: storage })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  return { entries, storage, browser };
};

const signIn = (storage, id) => {
  storage.setItem('mm_token', `token-${id}`);
  storage.setItem('mm_user', JSON.stringify({ id, username: `reader-${id}`, coins: 0 }));
};

const importSocial = async () => {
  const result = await build({ entryPoints: ['src/services/socialService.ts'], bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env': '{}' } });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
};

test('progress deduplicates each source, preserves the half-point reading bonus, and caps only the percent', () => {
  assert.deepEqual(calculateMangaRewardProgress([1, '1', 2], [2, '2', 3]), {
    purchasedCount: 2, completedCount: 2, points: 3, target: 10, percent: 30,
  });
  assert.equal(calculateMangaRewardProgress([], [1]).percent, 5);
  const overTarget = calculateMangaRewardProgress(Array.from({ length: 12 }, (_, index) => index + 1), [1]);
  assert.equal(overTarget.points, 12.5);
  assert.equal(overTarget.percent, 100);
  assert.equal(calculateMangaRewardProgress([], []).percent, 0);
});

test('completed chapters are scoped to the account and manga, survive rereads, and notify both tab paths', t => {
  const { browser, entries } = installBrowser(t);
  let updates = 0;
  const unsubscribe = subscribeMangaRewardProgress(() => updates++);
  recordCompletedRewardChapter(1, 20, 100);
  recordCompletedRewardChapter('1', '20', '100');
  assert.equal(updates, 1, 'rereading the same chapter adds no progress');
  recordCompletedRewardChapter(2, 20, 101);
  recordCompletedRewardChapter(1, 21, 102);
  assert.deepEqual([...getCompletedRewardChapterIds(1, 20)], ['100']);
  assert.deepEqual([...getCompletedRewardChapterIds(2, 20)], ['101']);
  assert.deepEqual([...getCompletedRewardChapterIds(1, 21)], ['102']);
  browser.dispatchEvent(Object.assign(new Event('storage'), { key: 'unrelated' }));
  assert.equal(updates, 3);
  browser.dispatchEvent(Object.assign(new Event('storage'), { key: [...entries.keys()][0] }));
  assert.equal(updates, 4, 'a completion written by another tab refreshes the preview');
  unsubscribe();
  browser.dispatchEvent(new Event(REWARD_PROGRESS_EVENT));
  browser.dispatchEvent(Object.assign(new Event('storage'), { key: null }));
  assert.equal(updates, 4, 'unmounted subscriptions stop receiving changes');
});

test('corrupted or denied local storage does not invent progress or break completion', t => {
  const { entries, storage } = installBrowser(t);
  recordCompletedRewardChapter(1, 20, 100);
  const key = [...entries.keys()][0];
  entries.set(key, '{broken');
  assert.equal(getCompletedRewardChapterIds(1, 20).size, 0);
  entries.set(key, JSON.stringify({ 100: true }));
  assert.equal(getCompletedRewardChapterIds(1, 20).size, 0);
  entries.set(key, JSON.stringify([100, '100', null, {}, false]));
  assert.deepEqual([...getCompletedRewardChapterIds(1, 20)], ['100']);
  t.mock.method(storage, 'setItem', () => { throw new Error('Quota exceeded'); });
  assert.doesNotThrow(() => recordCompletedRewardChapter(1, 20, 101));
  assert.deepEqual([...getCompletedRewardChapterIds(1, 20)], ['100']);
  t.mock.method(storage, 'getItem', () => { throw new Error('Storage denied'); });
  assert.equal(getCompletedRewardChapterIds(1, 20).size, 0);
});

test('account rewards combine existing manga history without duplicates or other accounts', t => {
  const { storage } = installBrowser(t);
  storage.setItem('mm_reward_completed_v1:["1","20"]', '[100,101]');
  storage.setItem('mm_reward_completed_v1:["1","21"]', '[101,102]');
  storage.setItem('mm_reward_completed_v1:["2","20"]', '[200]');
  storage.setItem('mm_reward_completed_v1:broken', '[300]');
  storage.setItem('mm_reward_completed_v1:["1","22"]', '{broken');
  assert.deepEqual([...getAccountCompletedRewardChapterIds(1)], ['100', '101', '102']);
  assert.deepEqual([...getAccountCompletedRewardChapterIds(2)], ['200']);
  assert.equal(getAccountCompletedRewardChapterIds('').size, 0);
  recordCompletedRewardChapter(1, 23, 103);
  assert.equal(calculateMangaRewardProgress([100, 400], getAccountCompletedRewardChapterIds(1)).points, 4);
  t.mock.method(storage, 'key', () => { throw new Error('Storage denied'); });
  assert.equal(getAccountCompletedRewardChapterIds(1).size, 0);
});

test('only successful completed requests add progress and the API contract is unchanged', async t => {
  const { storage } = installBrowser(t);
  signIn(storage, 1);
  let succeeds = true;
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ success: succeeds }), { status: succeeds ? 200 : 500 });
  });
  const { recordChapterProgress } = await importSocial();
  await recordChapterProgress(100, 20, false);
  assert.equal(getCompletedRewardChapterIds(1, 20).size, 0);
  succeeds = false;
  await assert.rejects(recordChapterProgress(101, 20, true));
  assert.equal(getCompletedRewardChapterIds(1, 20).size, 0);
  succeeds = true;
  await recordChapterProgress(102, 20, true);
  assert.deepEqual([...getCompletedRewardChapterIds(1, 20)], ['102']);
  assert.equal(calls[2].url, '/wp-json/mangamukai/v1/social/reading-progress');
  assert.equal(calls[2].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[2].options.body), { chapter_id: 102, manga_id: 20, completed: true });
});

test('switching accounts during an in-flight completion never credits the new account', async t => {
  const { storage } = installBrowser(t);
  signIn(storage, 1);
  const pending = Promise.withResolvers();
  t.mock.method(globalThis, 'fetch', () => pending.promise);
  const { recordChapterProgress } = await importSocial();
  const request = recordChapterProgress(100, 20, true);
  signIn(storage, 2);
  pending.resolve(new Response(JSON.stringify({ success: true })));
  await request;
  assert.deepEqual([...getCompletedRewardChapterIds(1, 20)], ['100']);
  assert.equal(getCompletedRewardChapterIds(2, 20).size, 0);
});
