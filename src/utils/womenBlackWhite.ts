import type { MangaCapitulo } from '../types/manga';

const blackWhiteTag = /^(?:manga\s*)?(?:b\s*[&/-]?\s*n|blanco\s*y?\s*negro|monocrom\w*)$/i;

const tagsOf = (manga: MangaCapitulo) =>
  [manga.tipo, ...(manga.genres || [])].filter(Boolean).map((tag) => String(tag).trim());

export const hasBlackWhiteTag = (manga: MangaCapitulo) =>
  tagsOf(manga).some((tag) => blackWhiteTag.test(tag));

export type Audience = 'Mujer' | 'Hombre';

 const hasAudience = (manga: MangaCapitulo, audience: Audience) => {
  const tags = tagsOf(manga).map((tag) => tag.toLowerCase());
  const tagged = tags.includes('mujer') || tags.includes('hombre');
  return tagged ? tags.includes(audience.toLowerCase()) : manga.genero === audience;
};

export const audienceOf = (manga: Pick<MangaCapitulo, 'genero' | 'genres' | 'tipo'> | null | undefined): Audience =>
  manga && hasAudience(manga as MangaCapitulo, 'Hombre') && !hasAudience(manga as MangaCapitulo, 'Mujer') ? 'Hombre' : 'Mujer';

 const isWomenBlackWhite = (manga: MangaCapitulo) =>
  hasAudience(manga, 'Mujer') && hasBlackWhiteTag(manga);

export const filterWomenBlackWhite = (items: MangaCapitulo[]) => items.filter(isWomenBlackWhite);

export const byTotalViews = (a: MangaCapitulo, b: MangaCapitulo) =>
  (b.totalViews ?? 0) - (a.totalViews ?? 0);

 const isMenBlackWhite = (manga: MangaCapitulo) =>
  hasAudience(manga, 'Hombre') && hasBlackWhiteTag(manga);

export const filterMenBlackWhite = (items: MangaCapitulo[]) => items.filter(isMenBlackWhite);

const hotTag = /^(?:manga\s*)?hot$/i;

export const hasHotTag = (manga: MangaCapitulo) => tagsOf(manga).some((tag) => hotTag.test(tag));

 const isWomenHot = (manga: MangaCapitulo) =>
  hasAudience(manga, 'Mujer') && hasHotTag(manga);

export const filterWomenHot = (items: MangaCapitulo[]) => items.filter(isWomenHot);

 const isMenHot = (manga: MangaCapitulo) =>
  hasAudience(manga, 'Hombre') && hasHotTag(manga);

export const filterMenHot = (items: MangaCapitulo[]) => items.filter(isMenHot);

export type CollectionBadge = 'bn' | 'hot' | null;

export const collectionBadge = (manga: MangaCapitulo | null | undefined): CollectionBadge => {
  if (!manga) return null;
  if (hasBlackWhiteTag(manga)) return 'bn';
  if (hasHotTag(manga)) return 'hot';
  return null;
};
