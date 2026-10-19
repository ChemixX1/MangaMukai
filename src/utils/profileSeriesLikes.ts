import type { MangaCapitulo } from '../types/manga';

/** Interaction IDs can include chapters; only catalog series belong in this tab. */
export const selectLikedSeries = (likedIds: string[], catalog: MangaCapitulo[]) => {
  const seriesById = new Map(catalog.map((manga) => [String(manga.id), manga]));
  return [...new Set(likedIds)].flatMap((id) => {
    const manga = seriesById.get(id);
    return manga ? [{ id: manga.id, title: manga.titulo, cover: manga.portada }] : [];
  });
};
