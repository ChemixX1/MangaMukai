const STORAGE_KEY = 'mm_social_login_return';
const MAX_AGE_MS = 10 * 60 * 1000;

export const safeAuthReturn = (value: unknown): string => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')
    || value.includes('\\') || [...value].some((character) => character.charCodeAt(0) <= 32)
    || /^\/auth(?:\/|\?|#|$)/i.test(value)) return '/';
  return value;
};

export const rememberSocialReturn = (provider: string, returnTo: string) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, returnTo: safeAuthReturn(returnTo), createdAt: Date.now() }));
  } catch {
    // Google can still sign in when the browser disallows optional session storage.
  }
};

export const readSocialReturn = (provider: string | null): string | null => {
  if (provider !== 'google' && provider !== 'discord') return null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || stored.provider !== provider || typeof stored.createdAt !== 'number'
      || Date.now() - stored.createdAt < 0 || Date.now() - stored.createdAt > MAX_AGE_MS) return null;
    return safeAuthReturn(stored.returnTo);
  } catch {
    return null;
  }
};

export const clearSocialReturn = () => {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Optional storage. */ }
};
