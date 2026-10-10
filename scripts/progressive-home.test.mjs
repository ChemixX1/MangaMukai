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
