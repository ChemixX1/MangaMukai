import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

test('visited manga titles survive reload without persisting the whole catalog', async t => {
  const previous = globalThis.sessionStorage;
  const stored = new Map();
  let writes = 0;
  globalThis.sessionStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => { stored.set(key, value); writes++; } };
  t.after(() => { globalThis.sessionStorage = previous; });
  const bundle = await build({ entryPoints: ['src/services/mangaTitles.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
  const url = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`;
  const first = await import(`${url}#first`);
  first.rememberMangaTitle(42, 'Solo en el catálogo');
  assert.equal(writes, 0);
  first.rememberVisitedMangaTitle('43', 'Serie visitada');
  first.rememberVisitedMangaTitle('43', 'Serie visitada');
  assert.equal(writes, 1, 'rerenders do not rewrite storage');
  const reloaded = await import(`${url}#reload`);
  assert.equal(reloaded.getKnownMangaTitle(43), 'Serie visitada');
  assert.equal(reloaded.getKnownMangaTitle(42), undefined);
  for (let id = 100; id < 205; id++) reloaded.rememberVisitedMangaTitle(String(id), `Serie ${id}`);
  const later = await import(`${url}#later`);
  assert.equal(later.getKnownMangaTitle(43), undefined);
  assert.equal(later.getKnownMangaTitle(204), 'Serie 204');
  assert.equal(JSON.parse([...stored.values()][0]).length, 100);
});
