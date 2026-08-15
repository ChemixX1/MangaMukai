import { MANGAMUKAI_API } from '../config/api';

const WP_AUTH = MANGAMUKAI_API;

export const AUTH_CHANGED_EVENT = 'mm_auth_changed';
export const AUTH_SESSION_EXPIRED_EVENT = 'mm_session_expired';

export interface MMUser {
  id: string | number;
  username: string;
  email: string;
  display_name?: string;
  avatar?: string;
  coins: number;
  isPremium?: boolean;
  premiumExpiry?: string | null;
  is_premium?: boolean;
  premium_expiry?: string | null;
}

export const getStoredUser = (): MMUser | null => {
  try {
    const raw = localStorage.getItem('mm_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null =>
  localStorage.getItem('mm_token');

const emitAuthChanged = () => {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const clearStoredAuth = (reason?: 'expired') => {
  localStorage.removeItem('mm_token');
  localStorage.removeItem('mm_user');
  emitAuthChanged();

  if (reason === 'expired') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
  }
};

export const saveAuth = (token: string, user: MMUser) => {
  localStorage.setItem('mm_token', token);
  localStorage.setItem('mm_user', JSON.stringify(user));
  emitAuthChanged();
};

export const clearAuth = async () => {
  clearStoredAuth();

  try {
    await fetch(`${WP_AUTH}/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // Silent: local auth was already cleared.
  }
};

const readJson = async <T>(res: Response): Promise<T | null> => {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

const localUnlockedKey = (userId: string | number) => `mm_unlocked_chapters_${userId}`;

const rememberUnlockedChapter = (chapterId: string | number) => {
  const user = getStoredUser();
  if (!user?.id) return;

  try {
    const key = localUnlockedKey(user.id);
    const raw = localStorage.getItem(key);
    const ids = new Set<string>(raw ? JSON.parse(raw) : []);
    ids.add(String(chapterId));
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Non-critical cache.
  }
};

const getLocallyUnlockedChapters = (): Set<string> => {
  const user = getStoredUser();
  if (!user?.id) return new Set<string>();

  try {
    const raw = localStorage.getItem(localUnlockedKey(user.id));
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
};

const clearIfUnauthorized = (res: Response): boolean => {
  if (res.status === 401 || res.status === 403) {
    clearStoredAuth('expired');
    return true;
  }
  return false;
};

/** Refreshes the current user from WordPress, including coins. */
export const refreshUser = async (): Promise<MMUser | null> => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${WP_AUTH}/me`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (clearIfUnauthorized(res)) return null;

    const data = await readJson<any>(res);
    if (data?.success && data.user) {
      const user = {
        ...data.user,
        isPremium: !!(data.user.isPremium || data.user.is_premium),
        premiumExpiry: data.user.premiumExpiry ?? data.user.premium_expiry ?? null,
      };
      saveAuth(data.token || token, user);
      return user;
    }

    // Clear session if WordPress returns success: false or a JWT error code
    if (data && (data.success === false || data.code?.includes('jwt') || data.data?.status === 403 || data.data?.status === 401)) {
      clearStoredAuth('expired');
      return null;
    }
  } catch {
    // Network hiccups should not log the user out.
  }

  return null;
};

export const startSubscriptionPayment = async (
  plan: 'monthly' | 'yearly' = 'monthly'
): Promise<{ success: boolean; url?: string; message: string }> => {
  const token = getStoredToken();
  if (!token) return { success: false, message: 'Debes iniciar sesion para suscribirte.' };

  try {
    const res = await fetch(`${WP_AUTH}/subscribe`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan, _token: token }),
    });

    if (clearIfUnauthorized(res)) {
      return { success: false, message: 'Tu sesion expiro. Inicia sesion nuevamente.' };
    }

    const data = await readJson<any>(res);
    if (data?.success && data.url) {
      return { success: true, url: data.url, message: '' };
    }

    return {
      success: false,
      message: data?.message || 'No se pudo generar el pago.',
    };
  } catch {
    return { success: false, message: 'Error de conexion.' };
  }
};

export const activateSubscription = async (orderId: string): Promise<boolean> => {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${WP_AUTH}/subscription/activate`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ order_id: orderId, _token: token }),
    });

    if (clearIfUnauthorized(res)) return false;

    const data = await readJson<any>(res);
    if (data?.success && data.is_premium) {
      const user = getStoredUser();
      if (user) {
        saveAuth(token, {
          ...user,
          isPremium: true,
          premiumExpiry: data.expiry ?? null,
        });
      }
      return true;
    }
  } catch {
    // PayPal IPN can arrive a few seconds later; the success page polls.
  }

  return false;
};

export const confirmCoinPurchase = async (
  paymentId: string | number
): Promise<{ success: boolean; completed: boolean; coins?: number }> => {
  const token = getStoredToken();
  if (!token) return { success: false, completed: false };

  try {
    const res = await fetch(
      `${WP_AUTH}/buy-coins/confirm?payment_id=${encodeURIComponent(String(paymentId))}&_token=${encodeURIComponent(token)}`,
      {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (clearIfUnauthorized(res)) return { success: false, completed: false };

    const data = await readJson<any>(res);
    if (data?.success) {
      if (typeof data.coins === 'number') {
        const user = getStoredUser();
        if (user) saveAuth(token, { ...user, coins: data.coins });
      }

      return {
        success: true,
        completed: !!data.completed,
        coins: typeof data.coins === 'number' ? data.coins : undefined,
      };
    }
  } catch {
    // Keep the success page graceful if confirmation is still pending.
  }

  return { success: false, completed: false };
};

interface BuyChapterResponse {
  success?: boolean;
  coins?: number;
  message?: string;
}

/** Buys/unlocks a chapter with myCRED. */
export const buyChapter = async (
  chapterId: string | number
): Promise<{ success: boolean; coins: number; message: string }> => {
  const token = getStoredToken();
  if (!token) return { success: false, coins: 0, message: 'Sin sesion' };

  const params = new URLSearchParams();
  params.append('chapter_id', String(chapterId));
  params.append('_token', token);

  try {
    const res = await fetch(`${WP_AUTH}/chapters/buy`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
      body: params.toString(),
    });

    if (clearIfUnauthorized(res)) {
      return { success: false, coins: 0, message: 'Tu sesion expiro. Inicia sesion nuevamente.' };
    }

    const data = await readJson<BuyChapterResponse>(res);

    if (data?.success) {
      rememberUnlockedChapter(chapterId);
    }

    if (data?.success && typeof data.coins === 'number') {
      const user = getStoredUser();
      if (user) saveAuth(token, { ...user, coins: data.coins });
    }

    return {
      success: !!data?.success,
      coins: data?.coins ?? 0,
      message: data?.message ?? '',
    };
  } catch {
    return { success: false, coins: 0, message: 'No se pudo conectar con el servidor.' };
  }
};

interface UnlockedChaptersResponse {
  success?: boolean;
  unlocked?: Array<string | number>;
}

/** Gets the IDs of chapters unlocked by the current user. */
export const getUnlockedChapters = async (): Promise<Set<string>> => {
  const token = getStoredToken();
  if (!token) return new Set<string>();

  try {
    const res = await fetch(`${WP_AUTH}/chapters/unlocked`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (clearIfUnauthorized(res)) return new Set<string>();

    const data = await readJson<UnlockedChaptersResponse>(res);
    return new Set<string>([
      ...(data?.unlocked ?? []).map(String),
      ...getLocallyUnlockedChapters(),
    ]);
  } catch {
    return getLocallyUnlockedChapters();
  }
};
