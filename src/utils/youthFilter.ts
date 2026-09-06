import type { MangaCapitulo } from '../types/manga';

// Tags que NO deben aparecer en las secciones juveniles (hombres) del home.
// Se normaliza quitando símbolos, así "B&N", "B/N" y "BN" caen todas en "bn".
const EXCLUDED_YOUTH_TAGS = new Set([
  'bn',
  'byn',
  'blancoynegro',
  'blanconegro',
  'monocromo',
  'monocromatico',
  'hot',
  'caliente',
  '19',
  'adulto',
  'adultos',
]);

const normalizeTag = (tag: string) => tag.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Compara por igualdad, no por contenido: así "One shot" no se descarta por
 * llevar "hot" dentro. También admite el prefijo "manga" ("Manga B&N").
 */
const isExcludedTag = (tag: string) => {
  const normalized = normalizeTag(tag);
  if (EXCLUDED_YOUTH_TAGS.has(normalized)) return true;
  return normalized.startsWith('manga') && EXCLUDED_YOUTH_TAGS.has(normalized.slice(5));
};

/**
 * Deja solo mangas de género Hombre y descarta los que llevan tags como
 * B&N / BN / HOT. Se usa en las secciones juveniles del home.
 */
export const filterYouthMen = <T extends Pick<MangaCapitulo, 'genres' | 'genero' | 'tipo'>>(
  mangas: T[],
): T[] =>
  mangas.filter((manga) => {
    // El tipo también entra: algunas fichas guardan ahí la colección.
    const tags = [...(manga.genres || []), manga.tipo].filter(Boolean) as string[];
    const isMen = manga.genero === 'Hombre' || tags.map(normalizeTag).includes('hombre');
    return isMen && !tags.some(isExcludedTag);
  });
