import assert from 'node:assert/strict';
import test from 'node:test';
import { HOME_LISTS, createHomeDataLoader } from '../src/utils/progressiveHomeData.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
const manga = [{ id: 1, titulo: 'Manga', portada: '/cover.webp' }];

test('hero and trending start together; lower lists wait; each result publishes independently; cache deduplicates', async () => {
  const requests = [];
  const deferred = Object.fromEntries(HOME_LISTS.map(key => [key, Promise.withResolvers()]));
  const loader = createHomeDataLoader(Object.fromEntries(HOME_LISTS.map(key => [key, () => {
    requests.push(key);
    return deferred[key].promise;
  }])));
  const updates = [];
  const unsubscribe = loader.subscribe(snapshot => updates.push(snapshot));
  const pending = loader.load();
  assert.equal(loader.load(), pending);
  assert.deepEqual(requests, ['popularHistorical', 'popularWeekly']);
  deferred.popularHistorical.resolve(manga);
  await tick();
  assert.equal(loader.getSnapshot().popularHistorical, manga);
  assert.equal(loader.getSnapshot().isReady, false);
  assert.deepEqual(requests, ['popularHistorical', 'popularWeekly']);
  assert.equal(loader.getSnapshot().loaded.latestWomen, false);
  assert.equal(loader.getSnapshot().loaded.popularWeekly, false);
  deferred.popularWeekly.resolve(manga);
  await tick();
  assert.equal(requests.length, 7);
  for (const key of HOME_LISTS.slice(2)) deferred[key].resolve(manga);
  await pending;
  assert.equal(loader.getSnapshot().isReady, true);
  assert.equal(loader.getSnapshot().isOutage, false);
  assert.equal(updates.length, 7);
  assert.equal(updates[0].loaded.latestWomen, false, 'published snapshots remain immutable');
  await loader.load();
  assert.equal(requests.length, 7, 'returning to home uses cached data');
  unsubscribe();
});

test('failed hero does not block later sections; partial data is not an outage', async () => {
  const loader = createHomeDataLoader(Object.fromEntries(HOME_LISTS.map(key => [key, async () => {
    if (key === 'latestWomen') return manga;
    throw new Error('offline');
  }])));
  await loader.load();
  assert.equal(loader.getSnapshot().isReady, true);
  assert.equal(loader.getSnapshot().isOutage, false);
  assert.equal(loader.getSnapshot().latestWomen, manga);
});

test('complete outage retries; unmounted subscribers receive no updates', async () => {
  let recovered = false;
  const loader = createHomeDataLoader(Object.fromEntries(HOME_LISTS.map(key => [key, async () => recovered ? manga : []])));
  let notifications = 0;
  const unsubscribe = loader.subscribe(() => notifications++);
  await loader.load();
  assert.equal(loader.getSnapshot().isOutage, true);
  unsubscribe();
  recovered = true;
  await loader.load();
  assert.equal(loader.getSnapshot().isOutage, false);
  assert.equal(loader.getSnapshot().isReady, true);
  assert.equal(notifications, 7);
});

test('a stalled hero does not prevent the remaining sections from loading', async () => {
  const hero = Promise.withResolvers();
  const loader = createHomeDataLoader(Object.fromEntries(HOME_LISTS.map(key => [key,
    () => key === 'popularHistorical' ? hero.promise : Promise.resolve(manga),
  ])), 5);
  const lowerLoaded = new Promise(resolve => {
    const unsubscribe = loader.subscribe(snapshot => {
      if (snapshot.loaded.latestMen) { unsubscribe(); resolve(); }
    });
  });
  const pending = loader.load();
  await lowerLoaded;
  assert.equal(loader.getSnapshot().loaded.popularHistorical, false);
  assert.equal(loader.getSnapshot().latestWomen, manga);
  assert.equal(loader.getSnapshot().isReady, false);
  hero.resolve(manga);
  await pending;
  assert.equal(loader.getSnapshot().isReady, true);
});

test('returning after expiry refreshes progressively while the previous snapshot stays visible', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const requests = [];
  let refresh = false;
  const deferred = Object.fromEntries(HOME_LISTS.map(key => [key, Promise.withResolvers()]));
  const loader = createHomeDataLoader(Object.fromEntries(HOME_LISTS.map(key => [key, () => {
    requests.push(key);
    return refresh ? deferred[key].promise : Promise.resolve(manga);
  }])), 1200, 60_000);
  await loader.load();
  const previous = loader.getSnapshot();
  t.mock.timers.tick(59_999);
  await loader.load();
  assert.equal(requests.length, 7);
  assert.equal(loader.getSnapshot(), previous);

  t.mock.timers.tick(1);
  refresh = true;
  requests.length = 0;
  const pending = loader.load();
  assert.equal(loader.load(), pending, 'remounts share the refresh request');
  assert.equal(loader.getSnapshot(), previous, 'expiry does not blank the existing snapshot');
  assert.deepEqual(requests, ['popularHistorical', 'popularWeekly']);
  const updated = [{ id: 2, titulo: 'Nuevo manga', portada: '/new-cover.webp' }];
  deferred.popularHistorical.resolve(updated);
  await tick();
  assert.equal(loader.getSnapshot().popularHistorical, updated);
  assert.equal(loader.getSnapshot().latestWomen, manga);
  assert.equal(loader.getSnapshot().isReady, true);
  deferred.popularWeekly.resolve(updated);
  await tick();
  assert.equal(requests.length, 7);
  for (const key of HOME_LISTS.slice(2)) deferred[key].resolve(updated);
  await pending;
  assert.equal(loader.getSnapshot().latestWomen, updated);
  await loader.load();
  assert.equal(requests.length, 7, 'successful refresh starts a new freshness window');
});

test('failed or empty refresh responses preserve visible sections and recover on a later revisit', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  let fail = false;
  let current = manga;
  const loader = createHomeDataLoader(Object.fromEntries(HOME_LISTS.map(key => [key, async () => {
    if (fail) {
      if (key === 'popularHistorical') throw new Error('offline');
      return [];
    }
    return current;
  }])), 1200, 60_000);
  await loader.load();
  t.mock.timers.tick(60_000);
  fail = true;
  const updates = [];
  const unsubscribe = loader.subscribe(snapshot => updates.push(snapshot));
  await loader.load();
  for (const snapshot of updates) {
    assert.equal(snapshot.isReady, true);
    assert.equal(snapshot.isOutage, false);
    for (const key of HOME_LISTS) assert.equal(snapshot[key], manga);
  }
  t.mock.timers.tick(60_000);
  fail = false;
  current = [{ id: 3, titulo: 'Recuperado', portada: '/recovered.webp' }];
  await loader.load();
  for (const key of HOME_LISTS) assert.equal(loader.getSnapshot()[key], current);
  unsubscribe();
});
