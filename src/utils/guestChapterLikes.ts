const key = (chapterId: string) => `mm_chapter_guest_like:${chapterId}`;

export const readGuestChapterLike = (chapterId: string): boolean => {
  try { return localStorage.getItem(key(chapterId)) === '1'; }
  catch { return false; }
};

export const setGuestChapterLike = (chapterId: string, liked: boolean) => {
  if (liked) localStorage.setItem(key(chapterId), '1');
  else localStorage.removeItem(key(chapterId));
};
