import { clearStoredAuth, getStoredToken } from './authService';
import { MANGAMUKAI_API } from '../config/api';
import { syncMangaSubscriptions } from './socialService';
import { readGuestMangaLike, toggleGuestMangaLike } from '../utils/guestMangaLikes';

const WP_AUTH = MANGAMUKAI_API;

const clearIfUnauthorized = (res: Response): boolean => {
  if (res.status === 401 || res.status === 403) {
    clearStoredAuth('expired');
    return true;
  }
  return false;
};

export interface UserInteractions {
  online_readers: number;
  bookmarks: string[];
  likes: string[];
  history: { manga_id: string; time: number }[];
  manga_likes?: number;
  manga_bookmarks?: number;
  manga_shares?: number;
}

export interface ToggleInteractionResult {
  action: 'added' | 'removed';
  total: number;
}

// Account data stays in memory and is discarded when the session changes.
const interactionsCache = new Map<string, { data: UserInteractions; expiresAt: number }>();
const interactionRequests = new Map<string, Promise<UserInteractions | null>>();
let interactionsOwner: string | null | undefined;
let interactionsRevision = 0;

const syncInteractionsOwner = () => {
  const token = getStoredToken();
  if (interactionsOwner !== token) {
    interactionsOwner = token;
    interactionsRevision++;
    interactionsCache.clear();
    interactionRequests.clear();
  }
  return token;
};

const withGuestLike = (data: UserInteractions, mangaId: string): UserInteractions => {
  if (getStoredToken()) return data;
  const liked = readGuestMangaLike(mangaId);
  return { ...data, likes: liked ? [mangaId] : [], manga_likes: Number(data.manga_likes || 0) + Number(liked) };
};

export const peekInteractions = (mangaId: string): UserInteractions | undefined => {
  syncInteractionsOwner();
  const cached = interactionsCache.get(mangaId);
  if (!cached) return;
  if (cached.expiresAt <= Date.now()) { interactionsCache.delete(mangaId); return; }
  return withGuestLike(cached.data, mangaId);
};

const updateInteractionCache = (mangaId: string, kind: 'likes' | 'bookmarks', result: ToggleInteractionResult) => {
  syncInteractionsOwner();
  // A GET started before a toggle must not overwrite the confirmed result.
  interactionsRevision++;
  interactionRequests.clear();
  for (const [id, entry] of interactionsCache) {
    const ids = entry.data[kind].filter(value => String(value) !== mangaId);
    if (result.action === 'added') ids.push(mangaId);
    entry.data = { ...entry.data, [kind]: ids, ...(id === mangaId ? { [`manga_${kind}`]: result.total } : {}) };
  }
};

const fetchInteractions = async (mangaId: string | undefined, token: string | null): Promise<UserInteractions | null> => {
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = `${WP_AUTH}/interactions`;
  if (mangaId) url += `?manga_id=${mangaId}`;

  try {
    const res = await fetch(url, { headers });
    if (token !== getStoredToken()) return null;
    if (token && clearIfUnauthorized(res)) return null;
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && token === getStoredToken()) {
      return data as UserInteractions;
    }
  } catch {              }
  return null;
};

export const getInteractions = (mangaId?: string): Promise<UserInteractions | null> => {
  const token = syncInteractionsOwner();
  if (!mangaId) return fetchInteractions(mangaId, token);
  const cached = peekInteractions(mangaId);
  if (cached) return Promise.resolve(cached);
  const pending = interactionRequests.get(mangaId);
  if (pending) return pending;
  const revision = interactionsRevision;
  const request = fetchInteractions(mangaId, token).then(data => {
    if (token !== getStoredToken()) return null;
    if (revision !== interactionsRevision) return peekInteractions(mangaId) ?? null;
    if (!data) return null;
    interactionsCache.set(mangaId, { data, expiresAt: Date.now() + 60_000 });
    while (interactionsCache.size > 24) interactionsCache.delete(interactionsCache.keys().next().value!);
    return withGuestLike(data, mangaId);
  }).finally(() => {
    if (interactionRequests.get(mangaId) === request) interactionRequests.delete(mangaId);
  });
  interactionRequests.set(mangaId, request);
  return request;
};

export const toggleBookmarkWithTotal = async (mangaId: string): Promise<ToggleInteractionResult | null> => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${WP_AUTH}/bookmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      },
      body: new URLSearchParams({ manga_id: mangaId, _token: token }).toString()
    });
    if (token !== getStoredToken()) return null;
    if (clearIfUnauthorized(res)) return null;
    const data = await res.json();
    if (data.success) {
      if (token !== getStoredToken()) return null;
      void syncMangaSubscriptions({ mangaId, action: data.action }).catch(() => undefined);
      const result: ToggleInteractionResult = {
        action: data.action,
        total: Number(data.total_bookmarks ?? 0),
      };
      updateInteractionCache(mangaId, 'bookmarks', result);
      return result;
    }
  } catch {              }
  return null;
};

export const toggleMangaLike = async (mangaId: string, guestPublicTotal = 0): Promise<ToggleInteractionResult | null> => {
  const token = getStoredToken();
  if (!token) return toggleGuestMangaLike(mangaId, guestPublicTotal);

  try {
    const res = await fetch(`${WP_AUTH}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
      body: new URLSearchParams({ manga_id: mangaId, _token: token }).toString(),
    });
    if (token !== getStoredToken()) return null;
    if (clearIfUnauthorized(res)) return null;
    const data = await res.json();
    if (data.success) {
      if (token !== getStoredToken()) return null;
      const result: ToggleInteractionResult = {
        action: data.action,
        total: Number(data.total_likes ?? 0),
      };
      updateInteractionCache(mangaId, 'likes', result);
      return result;
    }
  } catch {              }
  return null;
};
