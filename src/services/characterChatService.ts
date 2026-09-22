import { MANGAMUKAI_API } from '../config/api';
import { getStoredToken } from './authService';

/** Mensajes gratuitos por usuario (la cifra real la dicta el servidor; esta es la de respaldo). */
export const FREE_MESSAGE_LIMIT = 10;

export interface CharacterQuota {
  limit: number;
  used: number;
  remaining: number;
}

export type CharacterMessageMode = 'demo' | 'ai';

/** El servidor rechazó el mensaje porque ya no quedan gratuitos. */
export class CharacterQuotaError extends Error {
  quota: CharacterQuota;
  constructor(quota: CharacterQuota) {
    super(`Has usado tus ${quota.limit} mensajes gratuitos. Recarga monedas para seguir hablando con los personajes.`);
    this.name = 'CharacterQuotaError';
    this.quota = quota;
  }
}

interface QuotaPayload {
  success?: boolean;
  error?: string;
  id?: number;
  limit?: number;
  used?: number;
  remaining?: number;
}

const headers = (json = false): HeadersInit => {
  const token = getStoredToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const toQuota = (data: QuotaPayload | null): CharacterQuota => ({
  limit: typeof data?.limit === 'number' ? data.limit : FREE_MESSAGE_LIMIT,
  used: typeof data?.used === 'number' ? data.used : 0,
  remaining: typeof data?.remaining === 'number' ? data.remaining : FREE_MESSAGE_LIMIT,
});

/**
 * Mensajes gratuitos que quedan (GET /character-chat/quota, mu-plugin
 * mangamukai-character-chat.php). Con sesión cuenta por usuario; sin sesión,
 * por la huella del invitado. `null` si el servidor no responde.
 */
export const getCharacterQuota = async (): Promise<CharacterQuota | null> => {
  try {
    const response = await fetch(`${MANGAMUKAI_API}/character-chat/quota`, { headers: headers() });
    const data = (await response.json().catch(() => null)) as QuotaPayload | null;
    if (!response.ok || !data?.success) return null;
    return toQuota(data);
  } catch {
    return null;
  }
};

/**
 * Registra un mensaje de la conversación en el servidor. Los del usuario
 * consumen la cuota (lanza CharacterQuotaError al agotarse); los del personaje
 * solo quedan anotados. Devuelve la cuota tras registrar.
 */
export const registerCharacterMessage = async (
  characterId: string,
  role: 'user' | 'assistant',
  content: string,
  mode: CharacterMessageMode = 'demo',
): Promise<CharacterQuota> => {
  let response: Response;
  try {
    response = await fetch(`${MANGAMUKAI_API}/character-chat/messages`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ character_id: characterId, role, content, mode }),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }
  const data = (await response.json().catch(() => null)) as QuotaPayload | null;
  if (response.status === 402 && data?.error === 'quota_exhausted') throw new CharacterQuotaError(toQuota(data));
  if (response.status === 429) throw new Error('Espera unos segundos antes de enviar otro mensaje.');
  if (!response.ok || !data?.success) throw new Error('No se pudo registrar el mensaje. Inténtalo de nuevo.');
  return toQuota(data);
};
