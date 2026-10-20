import type { MangaCapitulo } from '../types/manga';

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

const isExcludedTag = (tag: string) => {
  const normalized = normalizeTag(tag);
  if (EXCLUDED_YOUTH_TAGS.has(normalized)) return true;
  return normalized.startsWith('manga') && EXCLUDED_YOUTH_TAGS.has(normalized.slice(5));
};

export const filterYouthMen = <T extends Pick<MangaCapitulo, 'genres' | 'genero' | 'tipo'>>(
  mangas: T[],
): T[] =>
  mangas.filter((manga) => {

    const tags = [...(manga.genres || []), manga.tipo].filter(Boolean) as string[];
    const isMen = manga.genero === 'Hombre' || tags.map(normalizeTag).includes('hombre');
    return isMen && !tags.some(isExcludedTag);
  });
