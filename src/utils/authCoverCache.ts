export interface SharedAuthCover {
  src: string;
  title: string;
}

let sharedAuthCovers: SharedAuthCover[] | null = null;

export const getSharedAuthCovers = () => sharedAuthCovers;

export const seedSharedAuthCovers = (
  mangas: Array<{ portada?: string; titulo?: string }>,
  limit = 48,
) => {
  const seen = new Set<string>();
  const covers: SharedAuthCover[] = [];

  for (const manga of mangas) {
    const src = manga.portada?.trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    covers.push({ src, title: manga.titulo || "Manga Mukai" });
    if (covers.length >= limit) break;
  }

  if (covers.length > 0) sharedAuthCovers = covers;
  return covers;
};

export const setSharedAuthCovers = (covers: SharedAuthCover[]) => {
  if (covers.length > 0) sharedAuthCovers = covers;
};
