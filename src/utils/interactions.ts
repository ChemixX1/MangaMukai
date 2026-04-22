import { getStoredToken } from './auth';

const WP_AUTH = 'https://mangamukai.com/wp-json/mangamukai/v1';

export interface UserInteractions {
  online_readers: number;
  bookmarks: string[];
  likes: string[];
  history: { manga_id: string; time: number }[];
  manga_likes?: number;
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
    const data = await res.json();
    if (data.success) {
      return data as UserInteractions;
    }
  } catch { /* silent */ }
  return null;
};

/** Alterna el estado de guardado (bookmark) de un manga */
export const toggleBookmark = async (mangaId: string): Promise<'added' | 'removed' | null> => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${WP_AUTH}/bookmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      },
      body: `manga_id=${mangaId}`
    });
    const data = await res.json();
    if (data.success) return data.action;
  } catch { /* silent */ }
  return null;
};

/** Alterna el estado de "me gusta" (like) de un manga y devuelve el nuevo conteo global */
export const toggleLike = async (mangaId: string): Promise<{ action: 'added' | 'removed', total: number } | null> => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${WP_AUTH}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      },
      body: `manga_id=${mangaId}`
    });
    const data = await res.json();
    if (data.success) return { action: data.action, total: data.total_likes };
  } catch { /* silent */ }
  return null;
};

/** Agrega un manga al historial de lectura y cuenta como vista global */
export const recordHistory = async (mangaId: string): Promise<boolean> => {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${WP_AUTH}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      },
      body: `manga_id=${mangaId}`
    });
    const data = await res.json();
    return !!data.success;
  } catch { /* silent */ }
  return false;
};
