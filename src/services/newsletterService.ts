import { MANGAMUKAI_API } from '../config/api';
import { getStoredToken } from './authService';

export type NewsletterOutcome = 'added' | 'exists' | 'invalid' | 'error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Alta en el boletín (botón UNIRME del footer): POST /mangamukai/v1/newsletter,
 * respondido por el mu-plugin mangamukai-newsletter.php. Si hay sesión se
 * envía el token para vincular el correo a la cuenta.
 */
export const subscribeToNewsletter = async (email: string, source = 'footer'): Promise<NewsletterOutcome> => {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(clean)) return 'invalid';

  const token = getStoredToken();
  try {
    const response = await fetch(`${MANGAMUKAI_API}/newsletter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email: clean, source }),
    });
    const data = (await response.json().catch(() => null)) as { success?: boolean; status?: string; error?: string } | null;
    if (response.status === 400 && data?.error === 'invalid_email') return 'invalid';
    if (!response.ok || !data?.success) return 'error';
    return data.status === 'exists' ? 'exists' : 'added';
  } catch {
    return 'error';
  }
};
