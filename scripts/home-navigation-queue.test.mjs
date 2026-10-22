import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeNavigationQueue, homePrefetchOrder } from '../src/utils/homeNavigationQueue.ts';

const target = (id, chapters = []) => ({ mangaId: String(id), chapterIds: chapters.map(String) });
const group = (current, next = [], visible = true) => ({ current, next, visible });
function setup(prepare = async () => {}) {
  const scheduled = [];
  const calls = [];
  const queue = createHomeNavigationQueue(task => {
    const job = { task, cancelled: false };
    scheduled.push(job);
    return () => { job.cancelled = true; };
  }, async (item, signal, stage) => { calls.push({ item, signal, stage }); await prepare(item, signal, stage); });
  const run = async () => {
    const job = scheduled.find(item => !item.cancelled);
    if (!job) return false;
    job.cancelled = true;
    await job.task();
    return true;
  };
  return { queue, calls, run };
}

test('visible sections and all current pages precede the adjacent pages, without mixing hidden chapters', () => {
  assert.deepEqual(homePrefetchOrder([
    group([target(1), target(2)], [target(3, [30])], false),
    group([target(4, [40]), target(1, [10])], [target(2, [20])]),
  ]), [target(4, [40]), target(1, [10]), target(2), target(3, [30]), target(2, [20])]);
});

test('series identity from recent cards reaches every stage even when the hero shares their route', async () => {
  const env = setup();
  env.queue.setGroup('latest', group([{ ...target(1, [11]), seriesId: '100' }]));
  env.queue.setGroup('hero', group([target(1)]));
  env.queue.setEnabled(true);
  while (await env.run()) {}
  assert.equal(env.calls.length, 3);
  assert.ok(env.calls.every(({ item }) => item.seriesId === '100'));
});

test('home finishes first, then all current lists precede content and extras, before page two', async () => {
  const env = setup();
  env.queue.setGroup('latest', group([target(1, [11, 12]), target(2)], [target(3)]));
  assert.equal(await env.run(), false);
  env.queue.setEnabled(true);
  while (await env.run()) { /* Drain one serial task at a time. */ }
  assert.deepEqual(env.calls.map(({ item, stage }) => [stage, item]), [
    ['detail', target(1)], ['detail', target(2)], ['reader', target(1, [11, 12])],
    ['extras', target(1)], ['extras', target(2)], ['detail', target(3)], ['extras', target(3)],
  ]);
});

test('changing pages cancels queued old work and selects the new current page first', async () => {
  const env = setup();
  env.queue.setGroup('latest', group([target(1), target(2)], [target(3), target(4)]));
  env.queue.setEnabled(true);
  await env.run();
  env.queue.setGroup('latest', group([target(3), target(4)], [target(5)]));
  while (await env.run()) {}
  assert.deepEqual(env.calls.filter(call => call.stage === 'detail').map(call => call.item.mangaId), ['1', '3', '4', '5']);
});

test('switching pages aborts in-flight speculation and leaving prevents further work', async () => {
  const first = Promise.withResolvers();
  const env = setup(item => item.mangaId === '1' ? first.promise : Promise.resolve());
  env.queue.setGroup('latest', group([target(1)], [target(2)]));
  env.queue.setEnabled(true);
  const running = env.run();
  env.queue.setGroup('latest', group([target(2)], [target(3)]));
  assert.equal(env.calls[0].signal.aborted, true);
  first.resolve();
  await running;
  await env.run();
  env.queue.stop();
  assert.equal(await env.run(), false);
  assert.deepEqual(env.calls.map(call => call.item.mangaId), ['1', '2']);
});

test('duplicate cards reuse completed work; added recent chapters and auth changes still prepare', async () => {
  const env = setup();
  env.queue.setGroup('hero', group([target(1)]));
  env.queue.setGroup('latest', group([target(1, [11, 11])]));
  env.queue.setEnabled(true);
  while (await env.run()) {}
  assert.deepEqual(env.calls.map(({ stage, item }) => [stage, item]), [
    ['detail', target(1)], ['reader', target(1, [11])], ['extras', target(1)],
  ]);
  env.queue.setGroup('latest', group([target(1, [11])]));
  assert.equal(await env.run(), false);
  env.queue.setGroup('latest', group([target(1, [11, 12])]));
  await env.run();
  assert.deepEqual(env.calls.at(-1).item, target(1, [12]));
  assert.equal(env.calls.at(-1).stage, 'reader');
  env.queue.reset();
  await env.run();
  assert.equal(env.calls.at(-1).stage, 'detail');
  assert.equal(env.calls.length, 5);
});

test('changing pages also cancels hidden chapters when their manga remains in the hero', async () => {
  const pending = Promise.withResolvers();
  const env = setup(item => item.chapterIds.includes('11') ? pending.promise : Promise.resolve());
  env.queue.setGroup('hero', group([target(1)]));
  env.queue.setGroup('latest', group([target(1, [11])]));
  env.queue.setEnabled(true);
  await env.run(); // The visible chapter list is ready before images start.
  const running = env.run();
  env.queue.setGroup('latest', group([target(2, [21])]));
  assert.equal(env.calls[1].signal.aborted, true);
  pending.resolve();
  await running;
  while (await env.run()) {}
  assert.deepEqual(env.calls.filter(call => call.stage === 'reader').map(call => call.item), [target(1, [11]), target(2, [21])]);
});

test('failed speculation never loops or blocks other current cards', async () => {
  const env = setup(() => Promise.reject(new Error('offline')));
  env.queue.setGroup('latest', group([target(1), target(2)]));
  env.queue.setEnabled(true);
  while (await env.run()) {}
  assert.equal(env.calls.length, 4);
});

test('visible series finish before offscreen and adjacent pages', async () => {
  const env = setup();
  env.queue.setGroup('offscreen', group([target(1, [11])], [target(3, [31])], false));
  env.queue.setGroup('visible', group([target(2, [21])]));
  env.queue.setEnabled(true);
  while (await env.run()) {}
  assert.deepEqual(env.calls.map(({ item, stage }) => `${item.mangaId}:${stage}`),
    ['2:detail', '2:reader', '2:extras', '1:detail', '1:reader', '1:extras', '3:detail', '3:reader', '3:extras']);
});
