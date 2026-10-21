import { MANGAMUKAI_API } from '../config/api';
import { clearStoredAuth, getStoredToken, getStoredUser } from './authService';
import { recordCompletedRewardChapter } from './mangaRewardProgress';
import type { ProfileSocialLinks } from './wordpressService';
import type { ProfilePost } from './profilePostService';

export const OPEN_CHAT_EVENT = 'mm_open_chat';

export const SOCIAL_REFRESH_EVENT = 'mm_social_refresh';

export const CHAT_ACCENT = '#ff008c';

export interface FriendUser {
  id: number;
  username: string;
  avatar_url: string;
  is_pro: boolean;

  is_online?: boolean;
  last_active?: string | null;
  created_at?: string;
}

export type FollowStatus = 'guest' | 'self' | 'none' | 'following';

export interface FollowEntry {
  user: FriendUser;
  created_at: string;

  viewer_follows: boolean;
}

export interface FollowLists {
  followers: FollowEntry[];
  following: FollowEntry[];
}

export interface PublicProfile extends FriendUser {
  bio: string;
  location: string;
  banner_url: string;
  banner_color: string;
  created_at: string;
  birth_date: string;
  phone: string;
  social_links: ProfileSocialLinks;
  posts: ProfilePost[];
  follow_status: FollowStatus;
  follows_you: boolean;
  followers_count: number;
  following_count: number;
  mangas_read_count: number;

  chapters_read_count?: number;
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
  | 'post_comment_like'
  | 'message'
  | 'comment_like'
  | 'comment_reaction'
  | 'comment_reply'
  | 'post_reaction'
  | 'post_comment'
  | 'post_share'
  | 'follow'
  | 'friend_request'
  | 'friend_accepted'
  | 'manga_update'
  | 'chapter_new'
  | 'manga_new';

export interface SocialNotificationPayload {
  comment_id?: number;
  parent_comment_id?: number;
  manga_id?: number;
  post_id?: number;
  reaction?: string;
  title?: string;
  excerpt?: string;

  chapter_id?: number;
  chapter_number?: number;
  chapter_title?: string;
  image?: string;
  is_paid?: boolean;
  price?: number;

  cover?: string;
}

export interface SocialNotification {
  id: number;
  type: SocialNotificationType;
  entity_id: string;
  payload: SocialNotificationPayload;
  actor: FriendUser | null;
  created_at: string;
  read: boolean;
}

export interface LibraryChapter {
  manga_id: number;
  title: string;
  cover: string;
  chapter_id: number;
  chapter_number: number;
  chapter_title: string;
  image: string;
}

export interface LibraryReading extends LibraryChapter {
  chapters_read: number;
  last_read_at: string;
}

export interface LibraryLikedChapter extends LibraryChapter {
  reaction: string;
}

export interface LibraryManga {
  manga_id: number;
  title: string;
  cover: string;
}

export interface SocialLibrary {

  reading: LibraryReading[];
  liked_chapters: LibraryLikedChapter[];
  liked_mangas: LibraryManga[];
}

interface ApiPayload {
  success?: boolean;
  profile?: PublicProfile;
  messages?: ChatMessage[];
  message?: ChatMessage | string;
  conversations?: Conversation[];
  notifications?: SocialNotification[];
  unread_count?: number;
  has_more?: boolean;
  followers?: FollowEntry[];
  following?: FollowEntry[];
  followers_count?: number;
  mangas_read_count?: number;
  users?: FriendUser[];
  reading?: LibraryReading[];
  liked_chapters?: LibraryLikedChapter[];
  liked_mangas?: LibraryManga[];
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

export const getPublicProfile = async (userId: string | number, signal?: AbortSignal): Promise<PublicProfile> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/profile/${userId}`, {
    signal,
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureResponse(response);
  if (!payload.profile) throw new Error('Perfil no encontrado.');
  return payload.profile;
};

export const followUser = async (userId: number): Promise<number> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/follow`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ user_id: userId }),
  });
  const payload = await ensureResponse(response);
  return Number(payload.followers_count || 0);
};

export const unfollowUser = async (userId: number): Promise<number> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/follow/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureResponse(response);
  return Number(payload.followers_count || 0);
};

export const getFollows = async (userId?: number): Promise<FollowLists> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/follows${userId ? `?user_id=${userId}` : ''}`, {
    credentials: 'include',
    headers: authHeaders(),
    cache: 'no-store',
  });
  const payload = await ensureResponse(response);
  return { followers: payload.followers || [], following: payload.following || [] };
};

export const getSocialLibrary = async (): Promise<SocialLibrary> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/library`, {
    credentials: 'include',
    headers: authHeaders(),
    cache: 'no-store',
  });
  const payload = await ensureResponse(response);
  return {
    reading: payload.reading || [],
    liked_chapters: payload.liked_chapters || [],
    liked_mangas: payload.liked_mangas || [],
  };
};

export const recordChapterProgress = async (chapterId: number | string, mangaId: number | string, completed: boolean): Promise<void> => {
  const userId = getStoredToken() ? getStoredUser()?.id : undefined;
  const response = await fetch(`${MANGAMUKAI_API}/social/reading-progress`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ chapter_id: Number(chapterId), manga_id: Number(mangaId), completed }),
  });
  await ensureResponse(response);
  if (completed && userId !== undefined) recordCompletedRewardChapter(userId, mangaId, chapterId);
};

export const recordMangaRead = async (mangaId: number | string, chapterId?: number | string): Promise<number> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/reads`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ manga_id: Number(mangaId), chapter_id: Number(chapterId || 0) }),
  });
  const payload = await ensureResponse(response);
  return Number(payload.mangas_read_count || 0);
};

export const getConversations = async (): Promise<{ conversations: Conversation[]; unread: number }> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/messages/conversations`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureResponse(response);
  return { conversations: payload.conversations || [], unread: Number(payload.unread_count || 0) };
};

export const getConversationMessages = async (userId: number, before?: number): Promise<{ messages: ChatMessage[]; hasMore: boolean }> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/messages/${userId}${before ? `?before=${before}` : ''}`, {
    credentials: 'include',
    headers: authHeaders(),
    cache: 'no-store',
  });
  const payload = await ensureResponse(response);
  return { messages: payload.messages || [], hasMore: !!payload.has_more };
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

let notificationsCache: SocialNotification[] | null = null;
export const getCachedNotifications = () => notificationsCache;

// Local preview only: never send deletion requests to the production proxy.
const localNotificationPreview = () => import.meta.env.DEV && typeof window !== 'undefined'
  && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const previewDeletionKey = () => `mm_notification_preview_deleted:${getStoredUser()?.id ?? 'guest'}`;
const previewDeleted = new Map<string, number>();
const previewCutoff = () => {
  const key = previewDeletionKey();
  try { return Math.max(previewDeleted.get(key) ?? 0, Number(localStorage.getItem(key)) || 0); }
  catch { return previewDeleted.get(key) ?? 0; }
};

export const deleteNotifications = async (throughId: number): Promise<void> => {
  if (localNotificationPreview()) {
    const cutoff = Math.max(previewCutoff(), throughId);
    const key = previewDeletionKey();
    previewDeleted.set(key, cutoff);
    try { localStorage.setItem(key, String(cutoff)); } catch { /* Keep the session preview usable. */ }
    notificationsCache = notificationsCache?.filter(item => item.id > cutoff) ?? null;
    return;
  }
  const response = await fetch(`${MANGAMUKAI_API}/social/notifications/delete`, {
    method: 'POST', credentials: 'include', headers: authHeaders(true),
    body: JSON.stringify({ through_id: throughId }),
  });
  await ensureResponse(response);
  notificationsCache = notificationsCache?.filter(item => item.id > throughId) ?? null;
};

export const getNotifications = async (): Promise<{ notifications: SocialNotification[]; unread: number }> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/notifications?limit=30`, {
    cache: 'no-store',
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureResponse(response);
  const localPreview = localNotificationPreview();
  const cutoff = localPreview ? previewCutoff() : 0;
  notificationsCache = (payload.notifications || []).filter(item => item.id > cutoff);
  return { notifications: notificationsCache, unread: localPreview ? notificationsCache.filter(item => !item.read).length : Number(payload.unread_count || 0) };
};

export const markNotificationsRead = async (id?: number): Promise<void> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/notifications/read`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify(id ? { id } : {}),
  });
  await ensureResponse(response);
  notificationsCache = notificationsCache?.map((item) => !id || item.id === id ? { ...item, read: true } : item) ?? null;
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
