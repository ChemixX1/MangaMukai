import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/services/communityService.ts'], bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' } });
test('chapter engagement shares requests, seeds subsets and invalidates after a like', async () => {
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.localStorage = globalThis.sessionStorage = storage;
  globalThis.window = { location: { hostname: 'localhost' } };
  let requests = 0;
  globalThis.fetch = async (_url, options) => {
    requests++;
    return { ok: true, json: async () => options?.method === 'POST'
      ? { success: true, reactions: { like: 8 }, my_reaction: 'like' }
      : { counts: { 1: 2, 2: 3 }, engagement: { 1: { reactions: { like: 7 }, my_reaction: '' } } } };
  };
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const [first, second] = await Promise.all([api.getChapterEngagement([1, 2]), api.getChapterEngagement([2, 1])]);
  assert.equal(requests, 1);
  assert.deepEqual(first, second);
  assert.equal(api.peekChapterEngagement([1]).engagement[1].reactions.like, 7);
  await api.getChapterEngagement([1]);
  assert.equal(requests, 1);
  await api.getChapterEngagement([1], true);
  assert.equal(requests, 2);
  await api.setEntityReaction('chapter', 1, 'like');
  assert.deepEqual(api.peekChapterEngagement([1]).counts, {});
  await api.getChapterEngagement([1]);
  assert.equal(requests, 4);
});

