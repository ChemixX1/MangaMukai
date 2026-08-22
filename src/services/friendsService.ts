import { MANGAMUKAI_API } from '../config/api';
import { clearStoredAuth, getStoredToken } from './authService';

export interface FriendUser {
  id: number;
  username: string;
  avatar_url: string;
  is_pro: boolean;
}

export interface FriendEntry {
  request_id: number;
  updated_at: string;
  user: FriendUser;
}

export interface FriendsOverview {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

interface ApiPayload {
  success?: boolean;
  message?: string;
  users?: FriendUser[];
  friends?: FriendEntry[];
  incoming?: FriendEntry[];
  outgoing?: FriendEntry[];
}

const EMPTY_OVERVIEW: FriendsOverview = {
  friends: [],
  incoming: [],
  outgoing: [],
};

const authHeaders = (json = false): HeadersInit => {
  const token = getStoredToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const readPayload = async (response: Response): Promise<ApiPayload> => {
  try {
    return await response.json() as ApiPayload;
  } catch {
    return {};
  }
};

const ensureAuthorized = (response: Response) => {
  if (response.status === 401 || response.status === 403) {
    clearStoredAuth('expired');
    throw new Error('Tu sesion expiro. Inicia sesion nuevamente.');
  }
};

export const getFriendsOverview = async (): Promise<FriendsOverview> => {
  const response = await fetch(`${MANGAMUKAI_API}/friends`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  ensureAuthorized(response);
  const payload = await readPayload(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'No se pudo cargar la lista de amigos.');
  }

  return {
    friends: payload.friends || [],
    incoming: payload.incoming || [],
    outgoing: payload.outgoing || [],
  };
};

export const searchFriendUsers = async (query: string): Promise<FriendUser[]> => {
  const response = await fetch(`${MANGAMUKAI_API}/friends/search?q=${encodeURIComponent(query.trim())}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  ensureAuthorized(response);
  const payload = await readPayload(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'No se pudo buscar usuarios.');
  }
  return payload.users || [];
};

export const sendFriendRequest = async (userId: number): Promise<void> => {
  const response = await fetch(`${MANGAMUKAI_API}/friends/request`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ user_id: userId }),
  });
  ensureAuthorized(response);
  const payload = await readPayload(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'No se pudo enviar la solicitud.');
  }
};

export const respondFriendRequest = async (
  requestId: number,
  action: 'accept' | 'reject',
): Promise<void> => {
  const response = await fetch(`${MANGAMUKAI_API}/friends/respond`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ request_id: requestId, action }),
  });
  ensureAuthorized(response);
  const payload = await readPayload(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'No se pudo responder la solicitud.');
  }
};

export const removeFriend = async (userId: number): Promise<void> => {
  const response = await fetch(`${MANGAMUKAI_API}/friends/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  ensureAuthorized(response);
  const payload = await readPayload(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'No se pudo eliminar la amistad.');
  }
};

export const emptyFriendsOverview = (): FriendsOverview => ({
  friends: [...EMPTY_OVERVIEW.friends],
  incoming: [...EMPTY_OVERVIEW.incoming],
  outgoing: [...EMPTY_OVERVIEW.outgoing],
});
