import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMangaRecommendations } from '../src/utils/mangaRecommendations.ts';

const manga = (id, extra = {}) => ({ id, titulo: `Serie ${id}`, portada: 'cover.webp', tipo: 'Manga', genres: [], ...extra });

test('one tag still finds synopsis matches ahead of popular unrelated series', () => {
  const current = manga(1, { genres: ['Fantasia'], descripcion: 'Dragones protegen un reino mágico.' });
  const result = buildMangaRecommendations(current, [current, manga(2, { descripcion: 'Un reino mágico lleno de dragones.' }), manga(3, { descripcion: 'Competencia deportiva escolar.', totalViews: 1000 })], []);
  assert.deepEqual(result.map(item => item.id), [2, 3]);
});

test('missing descriptions and tags fall back to available series without duplicates or self', () => {
  const result = buildMangaRecommendations(manga(10, { eroSeri: 1 }), [manga(1), manga(2), manga(20, { eroSeri: 2 }), manga(3, { totalViews: 100 })], [], 2);
  assert.deepEqual(result.map(item => item.id), [3, 2]);
});

test('server matches survive catalog failure and catalog counts enrich matches', () => {
  const related = [{ ...manga(2), sharedGenres: 1, totalViews: 5 }];
  assert.equal(buildMangaRecommendations(manga(1), [], related)[0].id, 2);
  const result = buildMangaRecommendations(manga(1), [manga(2, { chapterCount: 8 })], related);
  assert.equal(result.length, 1);
  assert.equal(result[0].chapterCount, 8);
  assert.deepEqual(buildMangaRecommendations(manga(1), [], []), []);
});
