import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { mostViewedMangas } from '../src/utils/mostViewedMangas.ts';
import config from '../src/config/seo-routes.json' with { type: 'json' };
import { seoHtml } from './seo-html.mjs';

const manga = (id, totalViews, extra = {}) => ({ id, titulo: `Manga ${id}`, totalViews, ...extra });

test('most viewed uses real counts, deduplicates series and resolves ties consistently', () => {
  const items = [manga(9, 0), manga(8, NaN), manga(7, Infinity), manga(6, -2), manga(22, 500, { eroSeri: 2 }), manga(2, 800), manga(3, 800), manga(4, 300)];
  assert.deepEqual(mostViewedMangas(items).map(item => item.id), [2, 3]);
  assert.deepEqual(mostViewedMangas(items, 0), []);
  assert.deepEqual(mostViewedMangas([manga(1, undefined)]), []);
});

test('navigation updates titles and canonical URLs and clears private robots metadata', async t => {
  const tags = new Map();
  const querySelectorAll = selector => [...tags.values()].filter(element => selector.split(',').some(part => {
    if (part === 'script[type="application/ld+json"]') return element.type === 'application/ld+json';
    if (part === 'meta[name="rating" i]') return element.attributes.name?.toLowerCase() === 'rating';
    if (part === 'meta[property^="og:image:"]') return element.attributes.property?.startsWith('og:image:');
    return tags.get(part) === element;
  }));
  const document = {
    title: '',
    getElementById: id => [...tags.values()].find(tag => tag.id === id),
    head: {
      querySelector: selector => querySelectorAll(selector)[0],
      querySelectorAll,
      appendChild: element => {
        const attr = element.attributes;
        const key = element.kind === 'script' ? `script#${element.id}` : element.kind === 'link' ? `link[rel="${attr.rel}"]` : `meta[${attr.name ? 'name' : 'property'}="${attr.name || attr.property}"]`;
        tags.set(key, element);
        element.remove = () => tags.delete(key);
      },
    },
    createElement: kind => ({ kind, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, getAttribute(name) { return this.attributes[name]; } }),
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  const result = await build({ stdin: { contents: "export * from './src/hooks/useDocumentTitle.ts'; export * from './src/services/mangaTitles.ts'; export { getLatestWomenUpdates, getLatestMenUpdates, getUltimosCapitulos } from './src/services/mangaService.ts';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env': '{}' } });
  const { applyRouteSeo, rememberMangaTitle, getLatestWomenUpdates, getLatestMenUpdates, getUltimosCapitulos } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  const meta = name => tags.get(`meta[name="${name}"]`).attributes.content;
  const canonical = document.createElement('link');
  canonical.setAttribute('rel', 'canonical');
  canonical.setAttribute('href', 'https://mangamukai.com/manga-bn');
  document.head.appendChild(canonical);
  const serverSchema = document.createElement('script');
  serverSchema.id = 'mm-page-schema';
  serverSchema.type = 'application/ld+json';
  serverSchema.textContent = JSON.stringify({ '@graph': [{ '@id': 'https://mangamukai.com/manga-bn#webpage', name: 'Título anterior', mainEntity: { '@type': 'ItemList', numberOfItems: 12 } }] });
  document.head.appendChild(serverSchema);
  document.title = 'Título anterior';
  applyRouteSeo('/manga-bn');
  assert.equal(document.title, 'Manga Blanco y Negro | MangaMukai');
  const preservedPage = JSON.parse(serverSchema.textContent)['@graph'][0];
  assert.equal(preservedPage.name, document.title);
  assert.equal(preservedPage.mainEntity.numberOfItems, 12);
  applyRouteSeo('/chat/alex/conversacion');
  assert.equal(meta('robots'), 'noindex,follow');
  applyRouteSeo('/chat');
  assert.equal(document.title, 'Character Chat | MangaMukai');
  assert.match(meta('description'), /vive una aventura/);
  assert.match(meta('robots'), /^index,follow/);
  applyRouteSeo('/comunidad');
  assert.equal(document.title, 'Comunidad | MangaMukai');
  assert.equal(tags.get('link[rel="canonical"]').attributes.href, 'https://mangamukai.com/comunidad');
  for (const route of ['/profile', '/perfil/editar', '/pro/pago', '/tienda/pago', '/mensajes/123', '/comunidad/guardados']) {
    applyRouteSeo(route);
    assert.equal(meta('robots'), 'noindex,follow', route);
  }
  applyRouteSeo('/recargar/');
  assert.equal(document.title, 'Recargar Monedas | MangaMukai');
  assert.equal(meta('robots'), 'noindex,follow');
  assert.equal(tags.get('link[rel="canonical"]').attributes.href, 'https://mangamukai.com/recargar');
  applyRouteSeo('/manga-bn');
  assert.equal(document.title, 'Manga Blanco y Negro | MangaMukai');
  assert.equal(meta('twitter:title'), 'Manga Blanco y Negro | MangaMukai');
  applyRouteSeo('/manga-19');
  assert.equal(document.title, config.routes['/manga-19'].title);
  assert.equal(meta('rating'), 'adult');
  assert.equal(JSON.parse(document.getElementById('mm-page-schema').textContent)['@graph'][2].isFamilyFriendly, false);
  applyRouteSeo('/');
  assert.equal(document.title, 'MangaMukai - Leer manga online gratis en español');
  assert.equal(meta('twitter:title'), 'MangaMukai - Leer manga online gratis en español');
  assert.equal(querySelectorAll('meta[name="rating" i]').length, 0);
  assert.equal(meta('googlebot-image'), 'index,follow');
  assert.equal(JSON.parse(document.getElementById('mm-page-schema').textContent)['@graph'][2].url, `${config.siteUrl}/`);
  rememberMangaTitle(42, 'La historia ya cargada');
  rememberMangaTitle(43, 'Otro manga');
  applyRouteSeo('/manga/42');
  assert.equal(document.title, 'La historia ya cargada | MangaMukai');
  assert.equal(meta('twitter:title'), document.title);
  assert.equal(JSON.parse(document.getElementById('mm-page-schema').textContent)['@graph'][2].mainEntity.name, 'La historia ya cargada');
  applyRouteSeo('/read/100');
  assert.equal(document.title, 'La historia ya cargada | MangaMukai');
  assert.equal(meta('twitter:title'), document.title);
  assert.equal(tags.get('link[rel="canonical"]').attributes.href, 'https://mangamukai.com/read/100');
  applyRouteSeo('/read/101');
  assert.equal(document.title, 'La historia ya cargada | MangaMukai');
  applyRouteSeo('/');
  applyRouteSeo('/read/999');
  assert.equal(document.title, 'MangaMukai', 'a reader without a known series never uses the generic Lector title');
  const recentManga = { id: 51, titulo: 'Serie del inicio', fecha: '2026-10-21', esGratis: true,
    capitulosRecientes: [{ id: 5101, numero: '1', esGratis: true }, { id: 5102, numero: '2', esGratis: false }] };
  const firstChapterManga = { id: 52, titulo: 'Otra serie del inicio', fecha: '2026-10-21', firstChapterId: 5201, esGratis: true };
  t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /\/latest-(women|men)\?limit=18$/);
    return { ok: true, json: async () => ({ success: true, mangas: [url.includes('/latest-women') ? recentManga : firstChapterManga] }) };
  });
  await Promise.all([getLatestWomenUpdates(), getLatestMenUpdates()]);
  for (const [chapterId, title] of [[5101, recentManga.titulo], [5102, recentManga.titulo], [5201, firstChapterManga.titulo]]) {
    applyRouteSeo('/');
    applyRouteSeo(`/read/${chapterId}`);
    assert.equal(document.title, `${title} | MangaMukai`, 'home chapter titles are available before the reader mounts or fetches');
    assert.equal(meta('twitter:title'), document.title);
  }
  await Promise.all([getLatestWomenUpdates(), getLatestMenUpdates()]);
  assert.equal(fetch.mock.callCount(), 2, 'titles and cached home lists need no additional requests');

  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    sessionStorage: { getItem: () => JSON.stringify({ data: [{ id: 53, titulo: 'Serie guardada', capitulosRecientes: [{ id: 5301 }] }], expiresAt: Date.now() + 60_000 }) },
  } });
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  });
  await getUltimosCapitulos();
  applyRouteSeo('/');
  applyRouteSeo('/read/5301');
  assert.equal(document.title, 'Serie guardada | MangaMukai', 'restoring the catalog also restores chapter titles');
  assert.equal(fetch.mock.callCount(), 2);
  applyRouteSeo('/manga/43');
  assert.equal(document.title, 'Otro manga | MangaMukai');
  applyRouteSeo('/manga/999');
  assert.equal(document.title, 'Ficha del manga | MangaMukai', 'unknown titles never reuse another manga name');
  applyRouteSeo('/not-a-page');
  assert.equal(meta('robots'), 'noindex,follow');
  assert.equal(meta('googlebot-image'), 'noindex');
  assert.equal(querySelectorAll('script[type="application/ld+json"]').length, 0);
});

test('verification tokens are escaped, absent tokens emit nothing and previews cannot be indexed', () => {
  const template = fs.readFileSync('index.html', 'utf8');
  const html = seoHtml(template, { VITE_GOOGLE_SITE_VERIFICATION: 'test"><script>alert(1)</script>', VITE_BING_SITE_VERIFICATION: 'bing-token' });
  assert.ok(html.includes(`google-site-verification" content="test&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;`));
  assert.match(html, /msvalidate\.01" content="bing-token"/);
  assert.ok(html.includes(config.routes['/'].title));
  assert.doesNotMatch(seoHtml(template), /google-site-verification|msvalidate/);
  const preview = seoHtml(template, { VITE_GITHUB_PAGES: 'true' });
  assert.match(preview, /name="robots" content="noindex,nofollow"/);
});

test('the HTML structured data is valid JSON', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => JSON.parse(match[1]));
});

test('local stylesheets, fonts and images referenced by HTML and CSS exist', () => {
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
  const files = ['index.html', ...walk('src').filter(file => file.endsWith('.css')), ...walk('public').filter(file => file.endsWith('.css'))];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const urls = file.endsWith('.css')
      ? [...source.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)].map(match => match[1])
      : [...source.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(match => match[1]);
    for (const raw of urls) {
      if (/^(?:data:|https?:|#)/.test(raw)) continue;
      const url = raw.split(/[?#]/)[0];
      const target = url.startsWith('/src/') ? url.slice(1) : url.startsWith('/') ? `public${url}` : path.resolve(path.dirname(file), url);
      assert.ok(fs.existsSync(target), `${file} references missing ${raw}`);
    }
  }
});
