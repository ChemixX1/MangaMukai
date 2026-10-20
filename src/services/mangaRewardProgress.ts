
export const REWARD_PROGRESS_EVENT = 'mm_reward_progress';
const STORAGE_PREFIX = 'mm_reward_completed_v1:';
const REWARD_TARGET = 10;

type ChapterId = string | number;

const normalizeId = (value: unknown): string | null => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return id || null;
};

const storageKey = (userId: ChapterId, mangaId: ChapterId): string | null => {
  const user = normalizeId(userId);
  const manga = normalizeId(mangaId);
  return user && manga ? `${STORAGE_PREFIX}${JSON.stringify([user, manga])}` : null;
};

const uniqueIds = (values: Iterable<ChapterId>): Set<string> => {
  const ids = new Set<string>();
  for (const value of values) {
    const id = normalizeId(value);
    if (id) ids.add(id);
  }
  return ids;
};

export const getCompletedRewardChapterIds = (userId: ChapterId, mangaId: ChapterId): Set<string> => {
  const key = storageKey(userId, mangaId);
  if (!key) return new Set();
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? uniqueIds(saved) : new Set();
  } catch {
    return new Set();
  }
};

export const getAccountCompletedRewardChapterIds = (userId: ChapterId): Set<string> => {
  const user = normalizeId(userId);
  const completed = new Set<string>();
  if (!user) return completed;
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      try {
        const scope: unknown = JSON.parse(key.slice(STORAGE_PREFIX.length));
        if (!Array.isArray(scope) || scope.length !== 2 || scope[0] !== user || typeof scope[1] !== 'string') continue;
        for (const chapter of getCompletedRewardChapterIds(user, scope[1])) completed.add(chapter);
      } catch {

      }
    }
  } catch {

  }
  return completed;
};

export const recordCompletedRewardChapter = (userId: ChapterId, mangaId: ChapterId, chapterId: ChapterId): void => {
  const key = storageKey(userId, mangaId);
  const chapter = normalizeId(chapterId);
  if (!key || !chapter) return;
  try {
    const completed = getCompletedRewardChapterIds(userId, mangaId);
    if (completed.has(chapter)) return;
    completed.add(chapter);
    localStorage.setItem(key, JSON.stringify([...completed]));
    window.dispatchEvent(new Event(REWARD_PROGRESS_EVENT));
  } catch {

  }
};

export const subscribeMangaRewardProgress = (onChange: () => void): (() => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) onChange();
  };
  window.addEventListener(REWARD_PROGRESS_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(REWARD_PROGRESS_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
};

export const calculateMangaRewardProgress = (purchasedIds: Iterable<ChapterId>, completedIds: Iterable<ChapterId>) => {
  const purchasedCount = uniqueIds(purchasedIds).size;
  const completedCount = uniqueIds(completedIds).size;
  const points = purchasedCount + completedCount * 0.5;
  return {
    purchasedCount,
    completedCount,
    points,
    target: REWARD_TARGET,
    percent: Math.min(100, points / REWARD_TARGET * 100),
  };
};
