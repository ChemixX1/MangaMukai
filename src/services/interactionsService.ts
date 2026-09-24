import { clearStoredAuth, getStoredToken } from './authService';
import { MANGAMUKAI_API } from '../config/api';
import { syncMangaSubscriptions } from './socialService';

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

/** Obtiene las interacciones (bookmarks, likes, historial) del usuario actual, y lectores online */
export const getInteractions = async (mangaId?: string): Promise<UserInteractions | null> => {
  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = `${WP_AUTH}/interactions`;
  if (mangaId) url += `?manga_id=${mangaId}`;

  try {
    const res = await fetch(url, { headers });
    if (token && clearIfUnauthorized(res)) return null;
    const data = await res.json();
    if (data.success) {
      return data as UserInteractions;
    }
  } catch { /* silent */ }
  return null;
};

/** Alterna el estado de guardado (bookmark) de un manga */
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
    if (clearIfUnauthorized(res)) return null;
    const data = await res.json();
    if (data.success) {
      void syncMangaSubscriptions({ mangaId, action: data.action }).catch(() => undefined);
      return {
        action: data.action,
        total: Number(data.total_bookmarks ?? 0),
      };
    }
  } catch { /* silent */ }
  return null;
};

/** Alterna el like del usuario autenticado y devuelve el total actualizado. */
export const toggleMangaLike = async (mangaId: string): Promise<ToggleInteractionResult | null> => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${WP_AUTH}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
      body: new URLSearchParams({ manga_id: mangaId, _token: token }).toString(),
    });
    if (clearIfUnauthorized(res)) return null;
    const data = await res.json();
    if (data.success) {
      return {
        action: data.action,
        total: Number(data.total_likes ?? 0),
      };
    }
  } catch { /* silent */ }
  return null;
};
