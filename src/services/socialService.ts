import { MANGAMUKAI_API } from '../config/api';
import { clearStoredAuth, getStoredToken } from './authService';
import type { ProfileSocialLinks } from './wordpressService';
import type { FriendUser } from './friendsService';

export const OPEN_CHAT_EVENT = 'mm_open_chat';

export type FriendshipStatus =
  | 'guest'
  | 'self'
  | 'none'
  | 'friends'
  | 'pending_sent'
  | 'pending_received';

export interface PublicProfile extends FriendUser {
  bio: string;
  location: string;
  banner_url: string;
  banner_color: string;
  created_at: string;
  social_links: ProfileSocialLinks;
  friendship_status: FriendshipStatus;
  friend_request_id: number;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  recipient_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
  other_user: FriendUser;
}

export interface Conversation extends ChatMessage {
  unread_count: number;
}

export type SocialNotificationType =
  | 'comment_like'
  | 'comment_reaction'
  | 'comment_reply'
  | 'friend_request'
  | 'friend_accepted'
  | 'manga_update';

export interface SocialNotification {
  id: number;
  type: SocialNotificationType;
  entity_id: string;
  payload: { comment_id?: number; parent_comment_id?: number; manga_id?: number; reaction?: string; title?: string };
  actor: FriendUser | null;
  created_at: string;
  read: boolean;
}

interface ApiPayload {
  success?: boolean;
  profile?: PublicProfile;
  messages?: ChatMessage[];
  message?: ChatMessage | string;
  conversations?: Conversation[];
  notifications?: SocialNotification[];
  unread_count?: number;
}

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

const ensureResponse = async (response: Response): Promise<ApiPayload> => {
  const payload = await readPayload(response);
  if (response.status === 401 || response.status === 403) {
    if (response.status === 401) clearStoredAuth('expired');
    throw new Error(typeof payload.message === 'string' ? payload.message : 'No tienes acceso a esta acción.');
  }
  if (!response.ok || !payload.success) {
    throw new Error(typeof payload.message === 'string' ? payload.message : 'No se pudo completar la acción.');
  }
  return payload;
};

export const getPublicProfile = async (userId: string | number): Promise<PublicProfile> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/profile/${userId}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureResponse(response);
  if (!payload.profile) throw new Error('Perfil no encontrado.');
  return payload.profile;
};

export const getConversations = async (): Promise<{ conversations: Conversation[]; unread: number }> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/messages/conversations`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureResponse(response);
  return { conversations: payload.conversations || [], unread: Number(payload.unread_count || 0) };
};

export const getConversationMessages = async (userId: number): Promise<ChatMessage[]> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/messages/${userId}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureResponse(response);
  return payload.messages || [];
};

export const sendChatMessage = async (recipientId: number, body: string): Promise<ChatMessage> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ recipient_id: recipientId, body }),
  });
  const payload = await ensureResponse(response);
  if (!payload.message || typeof payload.message === 'string') throw new Error('El mensaje no pudo enviarse.');
  return payload.message;
};

export const markConversationRead = async (userId: number): Promise<void> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/messages/read`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ user_id: userId }),
  });
  await ensureResponse(response);
};

export const getNotifications = async (): Promise<{ notifications: SocialNotification[]; unread: number }> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/notifications?limit=30`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureResponse(response);
  return { notifications: payload.notifications || [], unread: Number(payload.unread_count || 0) };
};

export const markNotificationsRead = async (id?: number): Promise<void> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/notifications/read`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify(id ? { id } : {}),
  });
  await ensureResponse(response);
};

export const syncMangaSubscriptions = async (
  value: { mangaIds: string[] } | { mangaId: string; action: 'added' | 'removed' },
): Promise<void> => {
  const body = 'mangaIds' in value
    ? { manga_ids: value.mangaIds }
    : { manga_id: value.mangaId, action: value.action };
  const response = await fetch(`${MANGAMUKAI_API}/social/manga-subscriptions`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  await ensureResponse(response);
};

export const openChat = (user: FriendUser) => {
  window.dispatchEvent(new CustomEvent<FriendUser>(OPEN_CHAT_EVENT, { detail: user }));
};
