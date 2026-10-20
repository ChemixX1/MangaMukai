import type { MangaCapitulo } from '../types/manga';
import { hasBlackWhiteTag, hasHotTag } from './womenBlackWhite';

export const normalizeSearchValue = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

const updatedAt = (manga: MangaCapitulo) => {
  const date = Date.parse((manga.rawFecha || manga.publishedAt || '').replace(' ', 'T'));
  return Number.isFinite(date) ? date : 0;
};

// These aliases affect the site's own search, not Google's ranking.
export const filterCatalog = (catalog: MangaCapitulo[], term: string): MangaCapitulo[] => {
  const query = normalizeSearchValue(term);
  if (!query) return [];
  let rest = query;
  const consume = (pattern: RegExp) => {
    const found = pattern.test(rest);
    rest = rest.replace(pattern, ' ');
    return found;
  };
  const mono = consume(/\b(?:blanco\s+(?:y\s+)?negro|b\s*[&/-]\s*n|bn|clasicos?|clasicas?|tradicional(?:es)?)\b/g);
  const hot = consume(/\b(?:hot|calientes?|adultos?|adultas?)\b|(?:\+19|\+18)/g);
  const youth = consume(/\bjuvenil(?:es)?\b/g);
  const terms = rest.replace(/\b(?:lecturas?|leer|mangas?|online|en|espanol|de|del|el|la|los|las|y|nuevos?|novedades|recientes?)\b/g, ' ')
    .split(/\s+/).filter(Boolean);
  return catalog.filter(manga => {
    if (mono && !hasBlackWhiteTag(manga)) return false;
    if (hot && !hasHotTag(manga)) return false;
    if (youth && (hasHotTag(manga) || hasBlackWhiteTag(manga))) return false;
    const haystack = normalizeSearchValue([manga.titulo, manga.tituloOriginal, manga.tipo, ...(manga.genres || [])].filter(Boolean).join(' '));
    return terms.every(word => haystack.includes(word));
  }).sort((a, b) => {
    // Exact titles remain first; category searches show the most recent updates.
    const exactA = normalizeSearchValue(a.titulo) === query;
    const exactB = normalizeSearchValue(b.titulo) === query;
    return Number(exactB) - Number(exactA) || updatedAt(b) - updatedAt(a) || String(a.id).localeCompare(String(b.id), 'en', { numeric: true });
  });
};
