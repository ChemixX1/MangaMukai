import assert from 'node:assert/strict';
import test from 'node:test';

let moduleId = 0;
const settle = () => new Promise(resolve => setImmediate(resolve));

const setup = async (t, { nativeIdle = true, observerThrows = false } = {}) => {
  let clock = 0;
  let handle = 0;
  const timers = new Map();
  const observers = new Set();
  const connection = Object.assign(new EventTarget(), { effectiveType: '4g', saveData: false, downlink: 10 });
  const navigator = { onLine: true, hardwareConcurrency: 8, deviceMemory: 8, connection };
  const document = Object.assign(new EventTarget(), { readyState: 'complete', hidden: false, images: [] });
  const window = Object.assign(new EventTarget(), {
    innerWidth: 400, innerHeight: 800,
    setTimeout(callback, delay) { const id = ++handle; timers.set(id, { at: clock + delay, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  if (nativeIdle) {
    window.requestIdleCallback = (callback, options) => {
      assert.equal(options, undefined, 'idle callbacks must not force a timeout');
      return window.setTimeout(() => callback({ timeRemaining: () => 50 }), 1);
    };
    window.cancelIdleCallback = window.clearTimeout;
  }
  class Observer {
    constructor(callback) { this.callback = callback; }
    observe() { if (observerThrows) throw new Error('resource unsupported'); observers.add(this); }
    disconnect() { observers.delete(this); }
  }
  const globals = { window, document, navigator, performance: { now: () => clock }, PerformanceObserver: Observer };
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
  }
  const api = await import(`../src/utils/backgroundTasks.ts?test=${++moduleId}`);
  const advance = async ms => {
    const end = clock + ms;
    while (true) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      clock = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
      await settle();
    }
    clock = end;
    await settle();
  };
  return {
    ...api, window, document, navigator, connection, timers, observers, advance,
    resource() { for (const observer of observers) observer.callback(); },
  };
};

test('background policy respects saving data, slow networks, offline and small devices', async t => {
  const env = await setup(t);
  assert.deepEqual(env.getBackgroundPolicy(), { allowSpeculation: true, constrained: false });
  env.navigator.deviceMemory = 4;
  assert.equal(env.getBackgroundPolicy().constrained, true);
  env.connection.saveData = true;
  assert.equal(env.getBackgroundPolicy().allowSpeculation, false);
  env.connection.saveData = false;
  for (const effectiveType of ['3g', '2g', 'slow-2g']) {
    env.connection.effectiveType = effectiveType;
    assert.equal(env.getBackgroundPolicy().allowSpeculation, false);
  }
  env.connection.effectiveType = '4g';
  env.connection.downlink = 1;
  assert.equal(env.getBackgroundPolicy().allowSpeculation, false);
  delete env.navigator.connection;
  assert.equal(env.getBackgroundPolicy().allowSpeculation, true, 'missing connection API is supported');
  env.navigator.onLine = false;
  assert.equal(env.getBackgroundPolicy().allowSpeculation, false);
});

test('holds, resource activity and input delay work until the page is quiet', async t => {
  const env = await setup(t);
  const calls = [];
  const release = env.blockBackgroundTasks();
  env.scheduleBackgroundTask('catalog', () => calls.push('catalog'));
  await env.advance(5000);
  assert.deepEqual(calls, []);
  release();
  release();
  await env.advance(1000);
  env.resource();
  await env.advance(1000);
  assert.deepEqual(calls, []);
  env.window.dispatchEvent(new Event('scroll'));
  await env.advance(799);
  assert.deepEqual(calls, []);
  await env.advance(2);
  assert.deepEqual(calls, ['catalog']);
  assert.equal(env.timers.size, 0);
  assert.equal(env.observers.size, 0, 'no observers survive an empty queue');
});

test('deduplicates subscribers, runs only one task and prioritizes intent', async t => {
  const env = await setup(t);
  const calls = [];
  const pending = Promise.withResolvers();
  const cancelFirst = env.scheduleBackgroundTask('home', () => { calls.push('home'); return pending.promise; });
  const cancelSecond = env.scheduleBackgroundTask('home', () => calls.push('duplicate'));
  cancelFirst();
  env.scheduleBackgroundTask('search', () => calls.push('search'), { priority: 'intent' });
  await env.advance(151);
  assert.deepEqual(calls, ['search']);
  await env.advance(1501);
  assert.deepEqual(calls, ['search', 'home']);
  env.scheduleBackgroundTask('next', () => calls.push('next'), { priority: 'intent' });
  await env.advance(5000);
  assert.deepEqual(calls, ['search', 'home'], 'pending tasks block all other work');
  cancelSecond();
  pending.resolve();
  await settle();
  await env.advance(151);
  assert.deepEqual(calls, ['search', 'home', 'next']);
});

test('cancelled work is removed and failed work can be scheduled again', async t => {
  const env = await setup(t);
  let calls = 0;
  const cancel = env.scheduleBackgroundTask('cancel', () => calls++);
  cancel();
  await env.advance(5000);
  assert.equal(calls, 0);
  assert.equal(env.timers.size, 0);
  assert.equal(env.observers.size, 0);
  env.scheduleBackgroundTask('retry', () => { calls++; throw new Error('offline'); });
  await env.advance(1501);
  assert.equal(calls, 1);
  env.scheduleBackgroundTask('retry', () => { calls++; return Promise.reject(new Error('network')); });
  await env.advance(1501);
  assert.equal(calls, 2);
  assert.equal(env.timers.size, 0);
});

test('hidden tabs and incomplete loads wait for lifecycle events without polling', async t => {
  const env = await setup(t);
  let calls = 0;
  env.document.hidden = true;
  env.scheduleBackgroundTask('route', () => calls++, { priority: 'intent' });
  await env.advance(5000);
  assert.equal(calls, 0);
  assert.equal(env.timers.size, 0);
  env.document.hidden = false;
  env.document.readyState = 'interactive';
  env.document.dispatchEvent(new Event('visibilitychange'));
  await env.advance(5000);
  assert.equal(calls, 0);
  env.document.readyState = 'complete';
  env.window.dispatchEvent(new Event('load'));
  await env.advance(151);
  assert.equal(calls, 1);
});

test('intent can warm on 3g; saving data blocks it until connection changes', async t => {
  const env = await setup(t);
  const calls = [];
  env.connection.effectiveType = '3g';
  env.connection.saveData = true;
  const cancelIdle = env.scheduleBackgroundTask('idle', () => calls.push('idle'));
  env.scheduleBackgroundTask('intent', () => calls.push('intent'), { priority: 'intent' });
  await env.advance(5000);
  assert.deepEqual(calls, []);
  env.connection.saveData = false;
  env.connection.dispatchEvent(new Event('change'));
  await env.advance(151);
  assert.deepEqual(calls, ['intent']);
  await env.advance(5000);
  assert.deepEqual(calls, ['intent']);
  assert.equal(env.timers.size, 0);
  cancelIdle();
});

test('connection changes are rechecked before an idle callback starts a request', async t => {
  const env = await setup(t);
  let calls = 0;
  env.scheduleBackgroundTask('intent', () => calls++, { priority: 'intent' });
  await env.advance(150);
  env.connection.saveData = true;
  await env.advance(1);
  assert.equal(calls, 0, 'a callback scheduled earlier still respects current policy');
  env.connection.saveData = false;
  env.connection.effectiveType = '2g';
  env.connection.dispatchEvent(new Event('change'));
  await env.advance(1000);
  assert.equal(calls, 0);
  env.connection.effectiveType = '4g';
  env.navigator.onLine = false;
  env.window.dispatchEvent(new Event('offline'));
  await env.advance(1000);
  assert.equal(calls, 0);
  env.navigator.onLine = true;
  env.window.dispatchEvent(new Event('online'));
  await env.advance(151);
  assert.equal(calls, 1);
});

test('visible image downloads defer work; missing idle and resource APIs have a safe fallback', async t => {
  const env = await setup(t, { nativeIdle: false, observerThrows: true });
  let calls = 0;
  let measurements = 0;
  const image = {
    complete: false, src: '/cover.webp',
    getBoundingClientRect() { measurements++; return { width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100 }; },
  };
  env.document.images.push(image);
  env.scheduleBackgroundTask('route', () => calls++);
  env.window.dispatchEvent(new Event('scroll'));
  assert.equal(measurements, 0, 'scroll never reads layout');
  await env.advance(1500);
  assert.equal(calls, 0);
  assert.equal(measurements, 1);
  image.complete = true;
  await env.advance(749);
  assert.equal(calls, 0);
  await env.advance(1);
  assert.equal(calls, 1);
});
