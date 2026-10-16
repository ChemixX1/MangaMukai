import assert from 'node:assert/strict';
import test from 'node:test';
import { createQueuedLike } from '../src/utils/queuedLike.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
const setup = () => {
  const requests = [];
  const states = [];
  const queue = createQueuedLike({ liked: false, count: 10 }, () => new Promise((resolve, reject) => requests.push({ resolve, reject })), state => states.push(state));
  return { queue, requests, states };
};

test('unlike is immediate during a pending like; server toggles are serialized', async () => {
  const { queue, requests, states } = setup();
  queue.click();
  queue.click();
  assert.deepEqual(states.at(-1), { liked: false, count: 10 });
  assert.equal(requests.length, 1);
  requests[0].resolve({ action: 'added', total: 11 });
  await tick();
  assert.equal(requests.length, 2);
  assert.deepEqual(states.at(-1), { liked: false, count: 10 });
  requests[1].resolve({ action: 'removed', total: 10 });
  await tick();
  assert.deepEqual(states.at(-1), { liked: false, count: 10 });
});

test('rapid toggles coalesce to the latest choice', async () => {
  const { queue, requests, states } = setup();
  queue.click(); queue.click(); queue.click();
  requests[0].resolve({ action: 'added', total: 11 });
  await tick();
  assert.equal(requests.length, 1);
  assert.deepEqual(states.at(-1), { liked: true, count: 11 });
});

test('failed save rolls back and a later click can retry', async () => {
  const { queue, requests, states } = setup();
  queue.click();
  requests[0].reject(new Error('offline'));
  await tick();
  assert.deepEqual(states.at(-1), { liked: false, count: 10 });
  queue.click();
  assert.equal(requests.length, 2);
  requests[1].resolve(null);
  await tick();
  assert.deepEqual(states.at(-1), { liked: false, count: 10 });
});

test('leaving a manga suppresses updates but saves the final choice', async () => {
  const { queue, requests, states } = setup();
  queue.click(); queue.click(); queue.dispose();
  const updates = states.length;
  requests[0].resolve({ action: 'added', total: 11 });
  await tick();
  requests[1].resolve({ action: 'removed', total: 10 });
  await tick();
  assert.equal(states.length, updates);
});
