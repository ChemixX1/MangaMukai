import { build } from 'vite';
import { writeFile } from 'node:fs/promises';

process.env.VITE_WORDPRESS_URL = 'https://mangamukai.com';
process.env.VITE_GITHUB_PAGES = 'true';
await build({ base: '/MangaMukai/', build: { outDir: 'dist-pages' } });
await writeFile('dist-pages/.nojekyll', '');
await writeFile('dist-pages/robots.txt', 'User-agent: *\nDisallow: /\n');
