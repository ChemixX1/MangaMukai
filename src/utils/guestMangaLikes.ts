const key = (mangaId: string) => `mm_manga_guest_like:${mangaId}`;

export const readGuestMangaLike = (mangaId: string): boolean => {
  try {
    return localStorage.getItem(key(mangaId)) === '1';
  } catch {
    return false;
  }
};

export const toggleGuestMangaLike = (mangaId: string, publicTotal: number) => {
  const liked = !readGuestMangaLike(mangaId);
  // Si el navegador no permite guardar, la cola revierte el estado optimista.
  if (liked) localStorage.setItem(key(mangaId), '1');
  else localStorage.removeItem(key(mangaId));
  return {
    action: liked ? 'added' as const : 'removed' as const,
    total: Math.max(0, publicTotal) + Number(liked),
  };
};
