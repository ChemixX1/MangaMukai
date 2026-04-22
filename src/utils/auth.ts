const WP_AUTH = 'https://mangamukai.com/wp-json/mangamukai/v1';

export interface MMUser {
  id: string | number;
  username: string;
  email: string;
  display_name?: string;
  avatar?: string;
  coins: number;
}

export const getStoredUser = (): MMUser | null => {
  try {
    const raw = localStorage.getItem('mm_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const getStoredToken = (): string | null =>
  localStorage.getItem('mm_token');

export const saveAuth = (token: string, user: MMUser) => {
  localStorage.setItem('mm_token', token);
  localStorage.setItem('mm_user', JSON.stringify(user));
  window.dispatchEvent(new Event('mm_auth_changed'));
};

export const clearAuth = async () => {
  localStorage.removeItem('mm_token');
  localStorage.removeItem('mm_user');
  window.dispatchEvent(new Event('mm_auth_changed'));
  // Destroy the WP session strictly to avoid ghost auto-logins via Google OAuth
  try {
    await fetch(`${WP_AUTH}/logout`, { method: 'POST' });
  } catch { /* silent */ }
};

/** Refresca los datos del usuario (incluyendo monedas) desde WordPress */
export const refreshUser = async (): Promise<MMUser | null> => {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch(`${WP_AUTH}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success && data.user) {
      saveAuth(token, data.user);
      return data.user;
    }
  } catch { /* silent */ }
  return null;
};

/** Compra un capítulo con myCRED. Devuelve { success, coins, message } */
export const buyChapter = async (chapterId: string | number): Promise<{ success: boolean; coins: number; message: string }> => {
  const token = getStoredToken();
  if (!token) return { success: false, coins: 0, message: 'Sin sesión' };

  const params = new URLSearchParams();
  params.append('chapter_id', String(chapterId));

  const res = await fetch(`${WP_AUTH}/chapters/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
    },
    body: params.toString(),
  });
  const data = await res.json();

  // Actualizar coins en localStorage si la compra fue exitosa
  if (data.success && typeof data.coins === 'number') {
    const user = getStoredUser();
    if (user) saveAuth(token, { ...user, coins: data.coins });
  }

  return {
    success: !!data.success,
    coins: data.coins ?? 0,
    message: data.message ?? '',
  };
};

/** Obtiene los IDs de capítulos desbloqueados del usuario */
export const getUnlockedChapters = async (): Promise<Set<string>> => {
  const token = getStoredToken();
  if (!token) return new Set();
  try {
    const res = await fetch(`${WP_AUTH}/chapters/unlocked`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return new Set<string>(data.unlocked ?? []);
  } catch { return new Set(); }
};
