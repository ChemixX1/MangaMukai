import type { MangaCapitulo } from '../types/manga';

/**
 * Etiqueta B&N de verdad. Se compara contra la etiqueta completa, no como
 * búsqueda dentro del texto: el criterio anterior daba por B&N cualquier cosa
 * con "acción", "shounen", "seinen" o "manga juvenil" en los géneros, y por eso
 * se colaban en la colección mangas que nunca se etiquetaron como B&N.
 */
const blackWhiteTag = /^(?:manga\s*)?(?:b\s*[&/-]?\s*n|blanco\s*y?\s*negro|monocrom\w*)$/i;

const tagsOf = (manga: MangaCapitulo) =>
  [manga.tipo, ...(manga.genres || [])].filter(Boolean).map((tag) => String(tag).trim());

export const hasBlackWhiteTag = (manga: MangaCapitulo) =>
  tagsOf(manga).some((tag) => blackWhiteTag.test(tag));

export type Audience = 'Mujer' | 'Hombre';

/**
 * Público del manga según su etiqueta Mujer/Hombre. El campo `genero` no es
 * fiable: el mismo manga llega como "Mujer" desde la biblioteca y como
 * "Hombre" desde los populares, así que manda la etiqueta y `genero` solo
 * cubre a los que no tienen ninguna.
 */
export const hasAudience = (manga: MangaCapitulo, audience: Audience) => {
  const tags = tagsOf(manga).map((tag) => tag.toLowerCase());
  const tagged = tags.includes('mujer') || tags.includes('hombre');
  return tagged ? tags.includes(audience.toLowerCase()) : manga.genero === audience;
};

/** Etiqueta de público que se muestra sobre la portada. */
export const audienceOf = (manga: Pick<MangaCapitulo, 'genero' | 'genres' | 'tipo'> | null | undefined): Audience =>
  manga && hasAudience(manga as MangaCapitulo, 'Hombre') && !hasAudience(manga as MangaCapitulo, 'Mujer') ? 'Hombre' : 'Mujer';

/** Mangas con público Mujer dentro de la colección B&N. */
export const isWomenBlackWhite = (manga: MangaCapitulo) =>
  hasAudience(manga, 'Mujer') && hasBlackWhiteTag(manga);

export const filterWomenBlackWhite = (items: MangaCapitulo[]) => items.filter(isWomenBlackWhite);

/** Orden de más vistos a menos. */
export const byTotalViews = (a: MangaCapitulo, b: MangaCapitulo) =>
  (b.totalViews ?? 0) - (a.totalViews ?? 0);

/** Mangas con público Hombre dentro de la colección B&N. */
export const isMenBlackWhite = (manga: MangaCapitulo) =>
  hasAudience(manga, 'Hombre') && hasBlackWhiteTag(manga);

export const filterMenBlackWhite = (items: MangaCapitulo[]) => items.filter(isMenBlackWhite);

/**
 * Etiqueta HOT literal. "+19" o "Manga para Adultos" no cuentan: la colección
 * solo admite lo que se etiquetó como HOT.
 */
const hotTag = /^(?:manga\s*)?hot$/i;

export const hasHotTag = (manga: MangaCapitulo) => tagsOf(manga).some((tag) => hotTag.test(tag));

/** Mangas con público Mujer dentro de la colección +19 (etiqueta HOT obligatoria). */
export const isWomenHot = (manga: MangaCapitulo) =>
  hasAudience(manga, 'Mujer') && hasHotTag(manga);

export const filterWomenHot = (items: MangaCapitulo[]) => items.filter(isWomenHot);

/** Mangas con público Hombre dentro de la colección +19 (etiqueta HOT obligatoria). */
export const isMenHot = (manga: MangaCapitulo) =>
  hasAudience(manga, 'Hombre') && hasHotTag(manga);

export const filterMenHot = (items: MangaCapitulo[]) => items.filter(isMenHot);

export type CollectionBadge = 'bn' | 'hot' | null;

/**
 * Colección a la que pertenece la ficha, para el distintivo de la portada en
 * MangaDetail. Sale de las etiquetas del propio manga, así que da igual desde
 * qué enlace se haya llegado.
 */
export const collectionBadge = (manga: MangaCapitulo | null | undefined): CollectionBadge => {
  if (!manga) return null;
  if (hasBlackWhiteTag(manga)) return 'bn';
  if (hasHotTag(manga)) return 'hot';
  return null;
};
