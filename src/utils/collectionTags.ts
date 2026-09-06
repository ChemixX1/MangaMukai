import type { MangaCapitulo } from '../types/manga';
import { audienceOf } from './womenBlackWhite';

export type CollectionKind = 'bn' | 'adult';

/**
 * Etiquetas que se muestran sobre las portadas en las páginas de colección.
 *
 * Siempre son dos y fijas: el público al que va la sección y la colección en la
 * que está. Así en B&N nunca aparece "HOT" (ni al revés), que es lo que pasaba
 * al pintar los géneros que llegan de WordPress.
 */
/**
 * Todas las etiquetas del manga tal como llegan de WordPress (sin repetidas).
 * Para el hero y el carrusel juvenil de +19, que muestran la lista completa;
 * si el manga no trae ninguna, se recurre a las dos fijas.
 */
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
