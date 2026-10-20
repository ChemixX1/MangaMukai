import type { MangaCapitulo } from '../types/manga';
import { audienceOf } from './womenBlackWhite';

export type CollectionKind = 'bn' | 'adult';

export const allMangaTags = (
  manga: Pick<MangaCapitulo, 'genero' | 'genres' | 'tipo'> | null | undefined,
  collection: CollectionKind,
): string[] => {
  const tags = [...new Set((manga?.genres ?? []).map((tag) => String(tag).trim()).filter(Boolean))];
  return tags.length > 0 ? tags : collectionTags(manga, collection);
};

export const collectionTags = (
  manga: Pick<MangaCapitulo, 'genero' | 'genres' | 'tipo'> | null | undefined,
  collection: CollectionKind,
): string[] => [
  audienceOf(manga),
  collection === 'bn' ? 'B&N' : 'HOT',
];
