import assert from 'node:assert/strict';
import test from 'node:test';
import { selectLikedSeries } from '../src/utils/profileSeriesLikes.ts';

const catalog = [{ id: 55005, titulo: 'Soneto del amanecer', portada: 'series-cover.webp' }];

test('liking chapter 55081 does not add its parent series to Series', () => {
  assert.deepEqual(selectLikedSeries(['55081'], catalog), []);
});

test('mixed likes show only the explicitly liked series with its own cover', () => {
  assert.deepEqual(selectLikedSeries(['55081', '55005', '55005'], catalog), [
    { id: 55005, title: 'Soneto del amanecer', cover: 'series-cover.webp' },
  ]);
});

test('removing the series like leaves no series even if a chapter is still liked', () => {
  assert.equal(selectLikedSeries(['55005', '55081'], catalog).length, 1);
  assert.deepEqual(selectLikedSeries(['55081'], catalog), []);
});
