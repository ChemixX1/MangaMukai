import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdaptivePoller, observePollingVisibility } from '../src/utils/adaptivePolling.ts';

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function setup(load = async () => 'unchanged') {
  let now = 0;
  const jobs = new Set();
  const calls = [];
  const poller = createAdaptivePoller(() => { calls.push(now); return load(); }, {
    activeMs: 5_000, idleMs: 15_000, quietMs: 30_000,
    now: () => now,
    schedule(callback, delay) {
      const job = { at: now + delay, callback };
      jobs.add(job);
      return () => jobs.delete(job);
    },
  });
  const advance = async ms => {
    const end = now + ms;
    for (;;) {
      const next = [...jobs].sort((a, b) => a.at - b.at)[0];
      if (!next || next.at > end) break;
      now = next.at;
      jobs.delete(next);
      next.callback();
      await settle();
    }
    now = end;
    await settle();
  };
  return { poller, calls, advance, nextDelay: () => Math.min(...[...jobs].map(job => job.at - now)) };
}

test('an idle visible chat progressively reduces traffic while opening immediately', async () => {
  const env = setup();
  env.poller.setEnabled(true);
  assert.deepEqual(env.calls, [0]);
  await settle();
  assert.equal(env.nextDelay(), 5_000);
  await env.advance(60_000);
  assert.equal(env.calls.length, 13);
  assert.equal(env.nextDelay(), 15_000);
  await env.advance(120_000);
  assert.equal(env.nextDelay(), 30_000);
  const afterQuiet = env.calls.length;
  await env.advance(60_000);
  assert.equal(env.calls.length - afterQuiet, 2);
});

test('new messages restore five-second polling after a quiet period', async () => {
  let result = 'unchanged';
  const env = setup(async () => result);
  env.poller.setEnabled(true);
  await settle();
  await env.advance(180_000);
  result = 'changed';
  await env.advance(30_000);
  assert.equal(env.nextDelay(), 5_000);
});

test('typing restores fast polling without a request per keystroke or postponing a pending poll', async () => {
  const env = setup();
  env.poller.setEnabled(true);
  await settle();
  await env.advance(180_000);
  const beforeTyping = env.calls.length;
  env.poller.activity();
  assert.equal(env.nextDelay(), 5_000);
  for (let i = 0; i < 4; i++) {
    await env.advance(1_000);
    env.poller.activity();
  }
  assert.equal(env.calls.length, beforeTyping);
  await env.advance(1_000);
  assert.equal(env.calls.length, beforeTyping + 1);
});

test('slow requests never overlap and repeated explicit refreshes coalesce into one follow-up', async () => {
  const pending = Promise.withResolvers();
  let first = true;
  const env = setup(() => {
    if (!first) return Promise.resolve('unchanged');
    first = false;
    return pending.promise;
  });
  env.poller.setEnabled(true);
  await env.advance(30_000);
  env.poller.refresh();
  env.poller.refresh();
  assert.equal(env.calls.length, 1);
  pending.resolve('unchanged');
  await settle();
  assert.deepEqual(env.calls, [0, 30_000]);
  assert.equal(env.nextDelay(), 5_000);
});

test('refresh after sending is immediate even when the conversation was quiet', async () => {
  const env = setup();
  env.poller.setEnabled(true);
  await settle();
  await env.advance(180_000);
  const beforeSend = env.calls.length;
  env.poller.refresh();
  assert.equal(env.calls.length, beforeSend + 1);
  await settle();
  assert.equal(env.nextDelay(), 5_000);
});

test('errors back off to two minutes, typing respects the delay, and success resets it', async () => {
  let fail = true;
  const env = setup(async () => { if (fail) throw new Error('offline'); return 'unchanged'; });
  env.poller.setEnabled(true);
  await settle();
  for (const expected of [10_000, 20_000, 40_000, 80_000, 120_000, 120_000]) {
    env.poller.activity();
    assert.equal(env.nextDelay(), expected);
    await env.advance(expected);
  }
  fail = false;
  env.poller.activity();
  await env.advance(120_000);
  assert.equal(env.nextDelay(), 15_000);
  env.poller.activity();
  assert.equal(env.nextDelay(), 5_000);
});

test('handled request failures also back off and do not count as an idle success', async () => {
  const env = setup(async () => 'error');
  env.poller.setEnabled(true);
  await settle();
  assert.equal(env.nextDelay(), 10_000);
  await env.advance(10_000);
  assert.equal(env.nextDelay(), 20_000);
});

test('pausing cancels scheduled work and resuming refreshes immediately only once', async () => {
  const env = setup();
  await env.advance(30_000);
  assert.equal(env.calls.length, 0);
  env.poller.setEnabled(true);
  await settle();
  env.poller.setEnabled(false);
  await env.advance(90_000);
  assert.deepEqual(env.calls, [30_000]);
  env.poller.setEnabled(true);
  env.poller.setEnabled(true);
  await settle();
  assert.deepEqual(env.calls, [30_000, 120_000]);
});

test('stop during an in-flight request prevents any rescheduled work', async () => {
  const pending = Promise.withResolvers();
  const env = setup(() => pending.promise);
  env.poller.setEnabled(true);
  env.poller.refresh();
  env.poller.stop();
  pending.resolve('changed');
  await settle();
  env.poller.activity();
  env.poller.refresh();
  env.poller.setEnabled(true);
  await env.advance(600_000);
  assert.equal(env.calls.length, 1);
  assert.equal(env.nextDelay(), Infinity);
});

test('returning during a slow request waits for it before refreshing', async () => {
  const pending = Promise.withResolvers();
  let first = true;
  const env = setup(() => {
    if (!first) return Promise.resolve('unchanged');
    first = false;
    return pending.promise;
  });
  env.poller.setEnabled(true);
  env.poller.setEnabled(false);
  await env.advance(60_000);
  env.poller.setEnabled(true);
  assert.equal(env.calls.length, 1);
  pending.resolve('unchanged');
  await settle();
  assert.deepEqual(env.calls, [0, 60_000]);
  assert.equal(env.nextDelay(), 5_000);
});

test('browser visibility and connectivity suspend polling and refresh on return', async t => {
  const page = new EventTarget();
  page.hidden = false;
  const browser = new EventTarget();
  const network = { onLine: true };
  for (const [name, value] of Object.entries({ document: page, window: browser, navigator: network })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; });
  }
  const env = setup();
  const cleanup = observePollingVisibility(env.poller);
  await settle();
  page.hidden = true;
  page.dispatchEvent(new Event('visibilitychange'));
  await env.advance(60_000);
  assert.equal(env.calls.length, 1);
  network.onLine = false;
  browser.dispatchEvent(new Event('offline'));
  page.hidden = false;
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(env.calls.length, 1);
  network.onLine = true;
  browser.dispatchEvent(new Event('online'));
  await settle();
  assert.equal(env.calls.length, 2);
  cleanup();
  browser.dispatchEvent(new Event('online'));
  await env.advance(60_000);
  assert.equal(env.calls.length, 2);
});
